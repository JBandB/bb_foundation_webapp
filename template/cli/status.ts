/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm template:status [--changes]`: hoe staat het template in dit project. `--changes` noemt elk
 * gewijzigd of ontbrekend bestand; zonder staan alleen de tellingen.
 */
import { lsRemoteTags } from "../lib/git";
import { compareVersions, latestTag, parseVersion } from "../lib/semver";
import { statusReport } from "../lib/status";

export function runStatus(root: string, args: readonly string[]): number {
  const report = statusReport(root);

  console.log(`Template ${report.manifestVersion} in deze repo${report.lock === undefined ? "" : `, toegepast als ${report.lock.version} op ${report.lock.appliedAt}`}`);
  if (report.lock === undefined) {
    console.log("Er is nog geen template.lock.json: draai pnpm template:apply.");
    return 1;
  }
  if (report.lock.version !== report.manifestVersion) console.log(`LET OP: de lock loopt achter op het manifest (${report.lock.version} tegen ${report.manifestVersion}). Draai pnpm template:apply.`);

  console.log(`Modules: ${report.modules.join(", ")}${report.skippedModules.length > 0 ? ` (nog niet beschikbaar: ${report.skippedModules.join(", ")})` : ""}`);
  if (report.configProblems.length > 0) {
    console.log("project.config.json is niet geldig:");
    for (const problem of report.configProblems) console.log(`  ${problem}`);
  }
  if (report.onDefaultConfig) console.log("LET OP: dit project draait nog op de standaardconfiguratie van het template. Zet de uitvoer van de wizard over project.config.json en draai pnpm template:apply.");

  console.log("\nBestanden van het template");
  console.log(`  ongewijzigd    ${report.unchanged.length}`);
  console.log(`  gewijzigd      ${report.changed.length}`);
  console.log(`  ontbreekt      ${report.missing.length}`);
  console.log(`  overgenomen    ${report.adopted.length}`);
  console.log(`  seeds          ${report.seeds.length}${report.seedsWithNewerSource.length > 0 ? ` (${report.seedsWithNewerSource.length} met een nieuwere opzet in het template)` : ""}`);

  if (args.includes("--changes")) {
    for (const path of report.changed) console.log(`  gewijzigd      ${path}`);
    for (const path of report.missing) console.log(`  ontbreekt      ${path}`);
    for (const path of report.adopted) console.log(`  overgenomen    ${path}`);
    for (const path of report.seedsWithNewerSource) console.log(`  nieuwere opzet ${path}`);
  } else if (report.changed.length + report.missing.length > 0) {
    console.log("  (pnpm template:status --changes noemt ze)");
  }

  console.log("");
  if (args.includes("--offline")) console.log("Versiecheck overgeslagen (--offline).");
  else if (report.lock.source === null) console.log("Geen git-adres van het template bekend (template.source in project.config.json), dus geen versiecheck.");
  else printVersionCheck(root, report.lock.source, report.lock.version);
  return report.configProblems.length > 0 ? 1 : 0;
}

function printVersionCheck(root: string, source: string, current: string): void {
  try {
    const tag = latestTag(lsRemoteTags(source, root));
    const latest = tag === undefined ? undefined : parseVersion(tag);
    const mine = parseVersion(current);
    if (tag === undefined || latest === undefined || mine === undefined) {
      console.log(`${source} heeft nog geen versietags.`);
    } else if (compareVersions(latest, mine) > 0) {
      console.log(`Nieuwere versie beschikbaar: ${tag}. Bijwerken: pnpm template:update`);
    } else {
      console.log(`Dit is de nieuwste versie (${tag}).`);
    }
  } catch (error) {
    console.log(`De versiecheck lukte niet: ${error instanceof Error ? error.message : String(error)}`);
  }
}
