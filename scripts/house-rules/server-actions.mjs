/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: een bestand met `"use server"` exporteert alleen async functies.
 *
 * **Waarom dit een huisregel is en geen ESLint-regel.** Het is een regel van
 * React, niet van TypeScript, en niets in de keten klaagt erover. Het
 * compileert, het lint, het bouwt, en dan is de waarde in de browser
 * `undefined`. De bundler vervangt namelijk elke export uit zo'n bestand door
 * een verwijzing naar een server-functie, en een object is dat niet.
 *
 * Dat kostte een middag zoeken naar een `Cannot read properties of undefined`
 * die niets te maken had met de regel waar hij afging. Vandaar deze controle.
 *
 * Wat wél mag: `export async function`, en een `export type` of
 * `export interface`, want die verdwijnen bij het compileren en bestaan dus
 * niet meer als export. Wat niet mag: een `export const`, een `export function`
 * zonder `async`, of een `export default`.
 *
 * De oplossing als deze regel afgaat is altijd dezelfde: zet de constante of
 * het type in een buurbestand zonder `"use server"` en importeer hem daaruit.
 */

import { firstCodeLine, lineAt } from "./files.mjs";

/** Alleen deze vormen zijn goed. */
const ALLOWED = [
  // export async function naam(
  /^export\s+async\s+function\s+\w+/,
  // export type X = ... en export interface X {, verdwijnen bij compileren
  /^export\s+type\s+\w/,
  /^export\s+interface\s+\w/,
  // export type { X } from "..." en export { type X } from "..."
  /^export\s+type\s*\{/,
];

/** Staat er bovenaan een "use server", los van aanhalingstekens en puntkomma. */
function isServerActionFile(text) {
  const firstCode = firstCodeLine(text);
  return firstCode === '"use server";' || firstCode === "'use server';";
}

export function checkServerActions(rel, text, report) {
  if (!rel.endsWith(".ts") && !rel.endsWith(".tsx")) return;
  if (!isServerActionFile(text)) return;

  const lines = text.split("\n");

  for (const [index, raw] of lines.entries()) {
    const line = raw.trim();
    if (!line.startsWith("export")) continue;
    if (ALLOWED.some((pattern) => pattern.test(line))) continue;

    report(
      `${rel}:${lineAt(text, text.indexOf(raw))} een "use server"-bestand mag alleen async functies exporteren, en deze export is dat niet. Zet hem in een buurbestand zonder "use server". Regel ${index + 1}: ${line.slice(0, 60)}`,
    );
  }
}
