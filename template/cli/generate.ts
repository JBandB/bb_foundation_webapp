/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm template:generate`: de gegenereerde bestanden opnieuw schrijven uit project.config.json.
 * Draai dit na elke wijziging aan de configuratie; apply doet het ook.
 */
import { readConfig } from "../lib/config";
import { formatProblems } from "../lib/dsl";
import { loadManifest } from "../lib/manifest";
import { generateAll, writeGenerated } from "../generators";

export function generate(root: string): number {
  const manifest = loadManifest(root);
  const report = readConfig(root, manifest);
  if (report.warnings.length > 0) {
    console.log("Waarschuwingen:");
    console.log(formatProblems(report.warnings));
  }
  if (report.config === undefined) {
    console.error("project.config.json is niet geldig:");
    console.error(formatProblems(report.errors));
    return 1;
  }

  const result = writeGenerated(root, generateAll(report.config, manifest));
  for (const path of result.written) console.log(`  geschreven   ${path}`);
  for (const path of result.unchanged) console.log(`  ongewijzigd  ${path}`);
  console.log(result.written.length === 0 ? "\nAlles was al actueel." : `\n${result.written.length} bestand(en) geschreven. Draai pnpm check:contrast en pnpm typecheck.`);
  return 0;
}
