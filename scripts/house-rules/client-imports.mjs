/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: een clientcomponent haalt geen waarde uit een module die de database raakt.
 *
 * **Waarom.** Een `"use client"`-bestand dat een constante of functie importeert uit `@/lib/db`,
 * `@/lib/integrations`, `@/lib/jobs`, `@/lib/messaging` of `@/lib/files`, trekt die hele boom de
 * browserbundel in: de Neon-driver, drizzle en het schema. In een eerder project was dat een chunk
 * van 561 KB op twee schermen, voor één label-functie en één lijst.
 *
 * `server-only` zou dit ook tegenhouden, maar dat pakket gooit bij elke import buiten de
 * server-conditie, en de controlescripts (tsx) en de unittests (vitest) importeren dezelfde
 * modules. Vandaar een huisregel.
 *
 * **Wat mag:** `import type` (verdwijnt bij het compileren), en een import uit een module zonder
 * databasetoegang, zoals `lib/domain/*` met pure functies. Wat niet mag: een waarde-import uit een
 * van de mappen hierboven, of uit een bestand dat zelf `@/lib/db` of `drizzle-orm` importeert.
 *
 * De oplossing als deze regel afgaat: zet de constante of pure functie in een eigen module zonder
 * databaseimport, en laat de oude plek hem opnieuw exporteren. Eigen servermappen van het project
 * komen erbij via `PROJECT_SERVER_PREFIXES` in project-rules.mjs.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { firstCodeLine, lineAt } from "./files.mjs";
import { PROJECT_SERVER_PREFIXES } from "./project-rules.mjs";

const SERVER_PREFIXES = [
  "@/lib/db",
  "@/lib/integrations",
  "@/lib/jobs",
  "@/lib/messaging",
  "@/lib/files",
  ...PROJECT_SERVER_PREFIXES,
];

function isClientFile(text) {
  const firstCode = firstCodeLine(text);
  return firstCode === '"use client";' || firstCode === "'use client';";
}

/** Raakt dit bestand zelf de database? Alleen de directe imports, dat is genoeg voor de vangst. */
function touchesDatabase(specifier) {
  const base = join(process.cwd(), specifier.replace(/^@\//, ""));
  for (const candidate of [`${base}.ts`, `${base}.tsx`, join(base, "index.ts")]) {
    if (!existsSync(candidate)) continue;
    const source = readFileSync(candidate, "utf8");
    /* Een `import type` verdwijnt bij het compileren en telt dus niet. */
    return /^\s*(import|export)\s+(?!type\b)[^;]*?from\s+["'](@\/lib\/db[^"']*|drizzle-orm[^"']*)["']/m.test(
      source,
    );
  }
  return false;
}

export function checkClientImports(rel, text, report) {
  if (!rel.endsWith(".tsx") && !rel.endsWith(".ts")) return;
  if (!isClientFile(text)) return;

  const pattern = /import\s+(type\s+)?(\{[^}]*\}|[\w$]+)\s+from\s+["'](@\/lib\/[^"']+)["']/g;
  for (const match of text.matchAll(pattern)) {
    if (match[1] !== undefined) continue;
    const names = match[2] ?? "";
    if (names.startsWith("{")) {
      const values = names
        .slice(1, -1)
        .split(",")
        .map((one) => one.trim())
        .filter((one) => one !== "" && !one.startsWith("type "));
      if (values.length === 0) continue;
    }

    const specifier = match[3] ?? "";
    const server =
      SERVER_PREFIXES.some((prefix) => specifier === prefix || specifier.startsWith(`${prefix}/`)) ||
      touchesDatabase(specifier);
    if (!server) continue;

    report(
      `${rel}:${lineAt(text, match.index ?? 0)} een clientcomponent importeert een waarde uit ${specifier}, en dat trekt de databasecode de browser in. Gebruik "import type", of zet de waarde in een module zonder databaseimport.`,
    );
  }
}
