/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: in een bestand met `"use server"` begint elke geëxporteerde functie met de sessie.
 *
 * **Waarom.** Een server action is een publiek endpoint. Een action die eerst naar de invoer kijkt
 * en pas daarna naar de sessie, geeft zonder sessie een gewoon antwoord terug ("de tekst is te lang")
 * in plaats van een weigering. In een eerder project vond het aanvalsscript precies dat bij een
 * nieuwe action: er lekte niets, maar het is het patroon dat bij de volgende action wel lekt. De
 * eerste regel van het lichaam is daarom `await requireActor()` of `await requireSession()`, met of
 * zonder `const`, vóór elke blik op de invoer. Pagina's en route handlers vallen hierbuiten; die
 * bewaken CLAUDE.md regel 11 en `requestOriginVerdict`.
 *
 * **Een bewust anonieme action** (inloggen, uitloggen, een hulpformulier op het inlogscherm) krijgt
 * direct boven de export een commentaar met `session-first:` en de reden. Zonder reden telt de
 * uitzondering niet.
 */

import { firstCodeLine, lineAt } from "./files.mjs";

const SESSION_FIRST = /^(?:(?:const|let)\s+[^=]+=\s*)?await\s+(?:requireActor|requireSession)\s*\(/;
const EXEMPTION = /session-first:\s*\S/;

/** Staat er bovenaan een "use server", los van aanhalingstekens en puntkomma. */
function isServerActionFile(text) {
  const firstCode = firstCodeLine(text);
  return firstCode === '"use server";' || firstCode === "'use server';";
}

/** De index net na de `)` die bij deze `(` hoort, of -1. */
function closingParen(text, open) {
  let depth = 0;
  for (let i = open; i < text.length; i += 1) {
    if (text[i] === "(") depth += 1;
    if (text[i] === ")") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }
  return -1;
}

/**
 * De index net na de `{` waarmee het lichaam begint, voorbij een eventueel returntype. Een
 * returntype als `Promise<{ ok: boolean }>` heeft zelf accolades; die tellen niet.
 */
function bodyStart(text, afterParams) {
  let i = afterParams;
  while (i < text.length && /\s/.test(text[i])) i += 1;
  if (text[i] === "{") return i + 1;
  if (text[i] !== ":") return -1;

  let angle = 0;
  let brace = 0;
  let paren = 0;
  for (i += 1; i < text.length; i += 1) {
    const c = text[i];
    if (c === "<") angle += 1;
    else if (c === ">") angle -= 1;
    else if (c === "(") paren += 1;
    else if (c === ")") paren -= 1;
    else if (c === "{") {
      if (angle === 0 && brace === 0 && paren === 0) return i + 1;
      brace += 1;
    } else if (c === "}") brace -= 1;
  }
  return -1;
}

/** De eerste regel met code in een lichaam: geen lege regel en geen commentaar. */
function firstStatement(body) {
  let inBlock = false;
  for (const raw of body.split("\n")) {
    const line = raw.trim();
    if (inBlock) {
      if (line.includes("*/")) inBlock = false;
      continue;
    }
    if (line === "" || line.startsWith("//")) continue;
    if (line.startsWith("/*")) {
      if (!line.includes("*/")) inBlock = true;
      continue;
    }
    return line;
  }
  return "";
}

/** Het commentaar dat direct boven de export staat, zonder lege regel ertussen. */
function commentAbove(text, index) {
  const lines = text.slice(0, index).split("\n");
  lines.pop();
  const found = [];
  while (lines.length > 0) {
    const line = (lines.pop() ?? "").trim();
    if (line.startsWith("//") || line.startsWith("/*") || line.startsWith("*")) {
      found.unshift(line);
      continue;
    }
    break;
  }
  return found.join("\n");
}

export function checkSessionFirst(rel, text, report) {
  if (!rel.endsWith(".ts") && !rel.endsWith(".tsx")) return;
  if (!isServerActionFile(text)) return;

  for (const match of text.matchAll(/export\s+async\s+function\s+(\w+)\s*\(/g)) {
    const name = match[1] ?? "";
    const index = match.index ?? 0;
    if (EXEMPTION.test(commentAbove(text, index))) continue;

    const afterParams = closingParen(text, index + match[0].length - 1);
    const start = afterParams === -1 ? -1 : bodyStart(text, afterParams);
    const statement = start === -1 ? "" : firstStatement(text.slice(start));
    if (SESSION_FIRST.test(statement)) continue;

    report(
      `${rel}:${lineAt(text, index)} ${name} begint niet met de sessie. De eerste regel van een server action is await requireActor() of requireSession(), vóór elke blik op de invoer. Bewust anoniem? Zet er een commentaar boven met "session-first:" en de reden`,
    );
  }
}
