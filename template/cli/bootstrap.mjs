#!/usr/bin/env node
/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De ingang van de template-tooling, zonder afhankelijkheden: controleert dat tsx er is en start
 * daarmee template/cli/main.ts. Het kindproces krijgt een argumentenlijst en geen shell, dus een
 * spatie of een & in het pad van de gebruiker doet niets.
 *
 * Gebruik via package.json: pnpm template:<opdracht>, of rechtstreeks: node template/cli/bootstrap.mjs <opdracht>.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, "..", "..");
const tsx = join(root, "node_modules", "tsx", "dist", "cli.mjs");

if (!existsSync(tsx)) {
  console.error("tsx ontbreekt. Draai eerst pnpm install in de map van het project.");
  process.exit(1);
}

const result = spawnSync(process.execPath, ["--env-file-if-exists=.env.local", tsx, join(here, "main.ts"), ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
  shell: false,
});

if (result.error !== undefined) {
  console.error(`De tooling kon niet starten: ${result.error.message}`);
  process.exit(1);
}
process.exit(result.status ?? 1);
