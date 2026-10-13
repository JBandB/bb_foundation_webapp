#!/usr/bin/env node
/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Dwingt de huisregels af die ESLint niet ziet, omdat ze ook over CSS, SQL,
 * markdown, migraties en workflows gaan. Zie CLAUDE.md, Definition of done.
 *
 * Gebruik: pnpm lint:house, en meeliftend op pnpm lint.
 *
 * De regels van het template staan in scripts/house-rules/, één per bestand:
 *
 *   no-em-dash            geen em-dashes, nergens
 *   no-hardcoded-colour   kleuren komen uit de tokens, plus driftcontrole
 *   env-template          geen echte waarde in .env.example
 *   server-actions        een "use server"-bestand exporteert alleen functies
 *   client-imports        een clientcomponent haalt geen databasecode binnen
 *   subquery-columns      een kolom in een subquery staat uitgeschreven met tabelnaam
 *   labels-size           geen labelbestand boven 600 regels; splits per domein
 *   no-config-import      project.config.json wordt nergens in de app geïmporteerd
 *   template-ownership    de kop van een bestand klopt met template.lock.json
 *
 * Eigen regels van het project staan in scripts/house-rules/project-rules.mjs, dat bij een update
 * van het template blijft staan. Een regel is een functie (rel, text, report) of (root, report).
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { collectFiles } from "./house-rules/files.mjs";
import { checkNoEmDash } from "./house-rules/no-em-dash.mjs";
import { checkNoHardcodedColour, checkTokenDrift } from "./house-rules/no-hardcoded-colour.mjs";
import { checkEnvTemplate } from "./house-rules/env-template.mjs";
import { checkServerActions } from "./house-rules/server-actions.mjs";
import { checkClientImports } from "./house-rules/client-imports.mjs";
import { checkSubqueryColumns } from "./house-rules/subquery-columns.mjs";
import { checkLabelsSize } from "./house-rules/labels-size.mjs";
import { checkNoConfigImport } from "./house-rules/no-config-import.mjs";
import { checkTemplateOwnership } from "./house-rules/template-ownership.mjs";
import { PROJECT_PER_FILE_RULES, PROJECT_WHOLE_REPO_RULES } from "./house-rules/project-rules.mjs";

/** Regels die per bestand kijken, met de vorm (rel, text, report). */
const PER_FILE_RULES = [
  checkNoEmDash,
  checkNoHardcodedColour,
  checkServerActions,
  checkClientImports,
  checkSubqueryColumns,
  checkLabelsSize,
  checkNoConfigImport,
  checkTemplateOwnership,
  ...PROJECT_PER_FILE_RULES,
];

/** Regels die over de repo als geheel gaan, met de vorm (root, report). */
const WHOLE_REPO_RULES = [checkTokenDrift, checkEnvTemplate, ...PROJECT_WHOLE_REPO_RULES];

const root = process.cwd();
const problems = [];
const report = (message) => problems.push(message);

const files = await collectFiles(root);

for (const rel of files) {
  const text = readFileSync(join(root, rel), "utf8");
  for (const rule of PER_FILE_RULES) {
    rule(rel, text, report);
  }
}

for (const rule of WHOLE_REPO_RULES) {
  rule(root, report);
}

if (problems.length > 0) {
  console.error(`Huisregels: ${problems.length} probleem(en) gevonden.\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`Huisregels: schoon. ${files.length} bestanden gecontroleerd.`);
