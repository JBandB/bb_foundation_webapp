/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm template:apply [--dry-run] [--force] [--strict] [--allow-dirty]`, en de slottekst die zegt
 * wat de mens nu doet, in volgorde.
 */
import { existsSync } from "node:fs";
import { join, resolve } from "node:path";
import { applyTemplate, ApplyError, type ApplyResult, type FileStatus } from "../lib/apply";
import type { Manifest } from "../lib/manifest";

const LABELS: Record<FileStatus, string> = {
  unchanged: "ongewijzigd",
  created: "aangemaakt",
  restored: "teruggezet",
  updated: "bijgewerkt",
  forced: "OVERSCHREVEN",
  rendered: "gerenderd",
  "seed-kept": "van het project",
  "seed-newer": "nieuwere opzet",
  "skipped-modified": "OVERGESLAGEN gewijzigd",
  adopted: "overgenomen",
  removed: "verwijderd",
};

/** Statussen die in de samenvatting als telling staan; de rest komt per bestand in beeld. */
const QUIET: readonly FileStatus[] = ["unchanged", "seed-kept", "adopted"];

export function runApply(root: string, args: readonly string[]): number {
  const { source, rest } = takeSource(args);
  const sourceRoot = source === undefined ? root : resolve(root, source);
  if (!existsSync(join(sourceRoot, "template", "manifest.json"))) {
    console.error(`${sourceRoot} is geen kopie van het template: template/manifest.json ontbreekt.`);
    return 1;
  }
  const flags = new Set(rest.filter((arg) => arg.startsWith("--")));
  const unknown = [...flags].filter((flag) => !["--dry-run", "--force", "--strict", "--allow-dirty"].includes(flag));
  if (unknown.length > 0) {
    console.error(`Onbekende optie: ${unknown.join(", ")}. Bekend: --dry-run, --force, --strict, --allow-dirty, --source <map>.`);
    return 1;
  }

  let result: ApplyResult;
  try {
    result = applyTemplate(root, sourceRoot, { dryRun: flags.has("--dry-run"), force: flags.has("--force"), allowDirty: flags.has("--allow-dirty"), now: new Date() });
  } catch (error) {
    if (error instanceof ApplyError) {
      console.error(error.message);
      return 1;
    }
    throw error;
  }

  printResult(result);
  const skipped = result.outcomes.filter((outcome) => outcome.status === "skipped-modified");
  if (flags.has("--strict") && skipped.length > 0) {
    console.error(`\n--strict: ${skipped.length} bestand(en) overgeslagen, dus niet alles is toegepast.`);
    return 1;
  }
  if (flags.has("--strict") && !result.dryRun && result.pendingSchema.length > 0) {
    console.error(`\n--strict: de migratie van ${result.pendingSchema.join(", ")} is niet gegenereerd, dus niet alles is toegepast.`);
    return 1;
  }
  return 0;
}

export function printResult(result: ApplyResult): void {
  const { config, manifest } = result;
  console.log(`${result.dryRun ? "Proefdraai van template" : "Template"} ${manifest.version} op ${config.project.name} (${config.project.slug})`);
  console.log(`Modules: ${result.activeModules.join(", ")}${result.skippedModules.length > 0 ? `; nog niet beschikbaar en overgeslagen: ${result.skippedModules.join(", ")}` : ""}`);

  console.log("\nBestanden");
  for (const status of QUIET) {
    const count = result.outcomes.filter((outcome) => outcome.status === status).length;
    if (count > 0) console.log(`  ${LABELS[status].padEnd(24)} ${count}`);
  }
  for (const outcome of result.outcomes) {
    if (QUIET.includes(outcome.status)) continue;
    console.log(`  ${LABELS[outcome.status].padEnd(24)} ${outcome.path}${outcome.note === undefined ? "" : `  (${outcome.note})`}`);
  }

  console.log("\nGedeelde bestanden");
  for (const merge of result.merges) {
    if (merge.changes.length === 0 && merge.warnings.length === 0) {
      console.log(`  ${merge.file.padEnd(24)} ongewijzigd`);
      continue;
    }
    for (const change of merge.changes) console.log(`  ${merge.file.padEnd(24)} ${change}`);
    for (const warning of merge.warnings) console.log(`  ${merge.file.padEnd(24)} LET OP: ${warning}`);
  }

  if (result.migrations.length > 0) {
    console.log("\nMigraties");
    for (const migration of result.migrations) {
      console.log(`  ${(migration.fresh ? "gegenereerd" : "stond er al").padEnd(24)} ${migration.tag}  (module ${migration.module}, schemaversie ${migration.version}${migration.kind === "custom" ? ", custom" : ""})`);
    }
  }

  if (result.warnings.length > 0) {
    console.log("\nWaarschuwingen");
    for (const warning of result.warnings) console.log(`  ${warning}`);
  }

  console.log(result.dryRun ? "\nProefdraai: er is niets geschreven." : "\ntemplate.lock.json geschreven.");
  if (!result.dryRun) printNextSteps(result, manifest);
}

/** Haalt `--source <map>` of `--source=<map>` uit de argumenten; de rest blijft over voor de vlaggen. */
function takeSource(args: readonly string[]): { source: string | undefined; rest: string[] } {
  const rest: string[] = [];
  let source: string | undefined;
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? "";
    if (argument === "--source") {
      index += 1;
      source = args[index];
    } else if (argument.startsWith("--source=")) {
      source = argument.slice("--source=".length);
    } else {
      rest.push(argument);
    }
  }
  return { source, rest };
}

function printNextSteps(result: ApplyResult, manifest: Manifest): void {
  console.log("\nWat je nu doet, in deze volgorde:");
  let step = 1;
  const say = (text: string): void => {
    console.log(`  ${step}. ${text}`);
    step += 1;
  };
  if (result.installNeeded) say("pnpm install");
  if (result.pendingSchema.length > 0) say(`pnpm template:apply  (nog een keer: dan wordt de migratie van ${result.pendingSchema.join(", ")} gegenereerd)`);
  if (result.migrations.some((migration) => migration.fresh)) say("Bekijk de gegenereerde migratie(s) in lib/db/migrations/ en de terugweg in lib/db/migrations/down/.");
  say("pnpm db:status  (de regel over je wegwerpbranch moet verschijnen; zo niet, controleer .env.local)");
  say("pnpm db:roundtrip  (migraties heen, terug en weer heen op je dev-branch)");
  say("pnpm typecheck && pnpm lint && pnpm test && pnpm check:contrast && pnpm template:verify");
  say("Commit alles, inclusief template.lock.json en de migraties.");

  const env = result.activeModules.flatMap((name) => manifest.modules[name]?.env ?? []);
  if (env.length > 0) {
    console.log("\nVariabelen per dienst (alleen de namen; waarden horen in Vercel en .env.local):");
    for (const variable of env) {
      const where = variable.where === "both" ? "Vercel en lokaal" : variable.where === "vercel" ? "alleen Vercel" : "alleen lokaal";
      console.log(`  ${variable.name.padEnd(32)} ${where.padEnd(18)} ${variable.secret ? "geheim  " : "        "} ${variable.guide}`);
    }
  }

  const manual = result.activeModules.flatMap((name) => manifest.modules[name]?.manual ?? []);
  if (manual.length > 0) {
    console.log("\nHandwerk buiten de code:");
    for (const task of manual) console.log(`  - ${task}`);
  }
}
