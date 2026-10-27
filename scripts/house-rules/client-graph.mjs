/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: wat een clientcomponent importeert, ook via een omweg, raakt geen database, geen
 * servervariabele en geen servermodule.
 *
 * **Waarom naast `client-imports`.** Die regel kijkt naar de directe imports van een
 * `"use client"`-bestand, en één niveau diep naar `@/lib/db` en `drizzle-orm`. Een omweg van twee
 * stappen ging erlangs: in een eerder project importeerde een formulier een pure regel, die zelf iets
 * uit de opslagkoppeling haalde, en zo stond de configuratie van de opslag (namen van containers en
 * van de tokenvariabelen) in een chunk die elke bezoeker downloadde. De huisregel bleef groen.
 *
 * **Wat de regel doet.** Vanaf elk `"use client"`-bestand onder `app/`, `components/` en `lib/` volgt
 * hij elke waarde-import (geen `import type`) binnen de repo, tot een `"use server"`-module: die wordt
 * een verwijzing naar de server en niet meegebundeld, dus daar stopt de wandeling. Een module onderweg
 * die `drizzle-orm`, `@neondatabase/*`, `@/lib/db`, `next-auth`, `@auth/*` of een `node:`-module
 * importeert, of `process.env` leest met een naam die niet `NODE_ENV` of `NEXT_PUBLIC_*` is, is een
 * fout. De melding noemt de route van de client naar die module.
 *
 * **De oplossing** is dezelfde als bij `client-imports`: zet de pure waarde in een eigen module zonder
 * serverimport, en laat de oude plek hem opnieuw exporteren als dat nodig is.
 *
 * Asynchroon, want de bestandenlijst is dat; de runner wacht erop.
 */

import { existsSync, readFileSync, statSync } from "node:fs";
import { dirname, join, relative, resolve } from "node:path";
import { collectFiles, firstCodeLine } from "./files.mjs";

const IMPORT = /^\s*(import|export)\s+(type\s+)?([^;]*?)\s*from\s+["']([^"']+)["']/gm;
const SIDE_EFFECT = /^\s*import\s+["']([^"']+)["']/gm;
const SERVER_PACKAGES = /^(drizzle-orm|@neondatabase\/|next-auth|@auth\/|node:)/;
const SERVER_PATHS = /^@\/lib\/db(\/|$)/;
const ENV_READ = /process\.env(?:\.([A-Z0-9_]+)|\[\s*["']([A-Z0-9_]+)["']\s*\])/g;

function resolveSpecifier(root, from, specifier) {
  let base;
  if (specifier.startsWith("@/")) base = join(root, specifier.slice(2));
  else if (specifier.startsWith(".")) base = resolve(dirname(from), specifier);
  else return undefined;
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts"), join(base, "index.tsx")]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return undefined;
}

/** Een `{ a, type B }`-lijst met alleen types telt niet als waarde-import. */
function onlyTypes(names) {
  if (!names.startsWith("{")) return false;
  const values = names
    .slice(1, -1)
    .split(",")
    .map((one) => one.trim())
    .filter((one) => one !== "" && !one.startsWith("type "));
  return values.length === 0;
}

export async function checkClientGraph(root, report) {
  const files = await collectFiles(root);
  const cache = new Map();
  const info = (file) => {
    const known = cache.get(file);
    if (known !== undefined) return known;
    const text = readFileSync(file, "utf8");
    const local = [];
    const problems = [];
    const visit = (specifier) => {
      if (SERVER_PACKAGES.test(specifier) || SERVER_PATHS.test(specifier)) problems.push(specifier);
      const resolved = resolveSpecifier(root, file, specifier);
      if (resolved !== undefined) local.push(resolved);
    };
    for (const match of text.matchAll(IMPORT)) {
      if (match[2] !== undefined || onlyTypes((match[3] ?? "").trim())) continue;
      visit(match[4] ?? "");
    }
    for (const match of text.matchAll(SIDE_EFFECT)) visit(match[1] ?? "");
    for (const match of text.matchAll(ENV_READ)) {
      const name = match[1] ?? match[2] ?? "";
      if (name !== "NODE_ENV" && !name.startsWith("NEXT_PUBLIC_")) problems.push(`process.env.${name}`);
    }
    const result = { directive: firstCodeLine(text) ?? "", local, problems };
    cache.set(file, result);
    return result;
  };

  const clients = files.filter(
    (rel) =>
      /\.(ts|tsx)$/.test(rel) &&
      !rel.endsWith(".test.ts") &&
      /^(app|components|lib)\//.test(rel) &&
      /^["']use client["'];?$/.test(info(join(root, rel)).directive),
  );
  const reported = new Set();
  for (const client of clients) {
    const start = join(root, client);
    const seen = new Set();
    const stack = [[start, [start]]];
    while (stack.length > 0) {
      const [file, path] = stack.pop();
      if (seen.has(file)) continue;
      seen.add(file);
      const node = info(file);
      if (file !== start && /^["']use server["']/.test(node.directive)) continue;
      if (file !== start && node.problems.length > 0) {
        const key = `${client}|${relative(root, file)}`;
        if (!reported.has(key)) {
          reported.add(key);
          const route = path.map((p) => relative(root, p).replace(/\\/g, "/")).join(" -> ");
          report(`${client} trekt via ${route} servercode de browser in (${[...new Set(node.problems)].join(", ")}). Zet de waarde in een module zonder serverimport.`);
        }
        continue;
      }
      for (const next of node.local) stack.push([next, [...path, next]]);
    }
  }
}
