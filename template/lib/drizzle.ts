/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De migratie van een module met een databaseschema wordt in het project gegenereerd, niet in het
 * template meegeleverd. De snapshot in `lib/db/migrations/meta/` en het tijdstempel `when` in het
 * journal zijn van het project: een meegeleverde migratie met een verzonnen tijdstempel laat latere
 * migraties stil overslaan (zie lib/db/migrations/README.md). Alleen de baseline van core reist met
 * de wortel mee, want een vers project heeft nog geen eigen migraties om tegen te botsen.
 *
 * Het algoritme per module die nog niet op zijn schemaversie staat:
 *   1. het project heeft geen openstaande drift (anders komt die in onze migratie terecht);
 *   2. de schemabestanden van de module staan in de boom en de schema-index noemt ze;
 *   3. `drizzle-kit generate --name=template_<module>_<versie>`, precies één journalregel erbij
 *      (nul mag: dan was er niets te doen);
 *   4. de terugweg uit het manifest naar `lib/db/migrations/down/<tag>.sql`;
 *   5. bij `custom`: `generate --custom`, de inhoud erin, de terugweg ernaast.
 * Alles via drizzle-kit zelf, met een onbereikbare connectiestring: generate leest alleen bestanden.
 *
 * Dit bestand raakt nooit een database.
 */
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { readText, writeText } from "./files";
import type { ModuleManifest } from "./manifest";

/* Geen geheim: een adres waar niets luistert, zodat drizzle-kit alleen bestanden leest. */
// secretlint-disable-next-line
export const UNREACHABLE_URL = "postgres://template-apply:none@127.0.0.1:1/none";
export const MIGRATIONS_DIR = "lib/db/migrations";
const TIMEOUT_MS = 60_000;

export class DrizzleError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DrizzleError";
  }
}

export interface SchemaStep {
  readonly version: number;
  readonly down: string;
  readonly custom: string | null;
  readonly customDown: string | null;
}

export interface GeneratedMigration {
  readonly tag: string;
  readonly kind: "generated" | "custom";
  /** Of drizzle-kit deze run iets schreef; false als de tag al in het journal stond. */
  readonly fresh: boolean;
}

/**
 * De schemaversies van een module die dit project nog niet heeft en waar het manifest een migratie
 * voor kent. Een versie zonder migratie in het manifest reist met de wortel mee (de baseline van
 * core) en telt als aanwezig.
 */
export function pendingSchemaSteps(module: ModuleManifest, appliedVersion: number): SchemaStep[] {
  const steps: SchemaStep[] = [];
  for (let version = appliedVersion + 1; version <= module.schemaVersion; version += 1) {
    const entry = module.migrations[String(version)];
    if (entry === undefined) continue;
    steps.push({ version, down: entry.down, custom: entry.custom, customDown: entry.customDown });
  }
  return steps;
}

export function hasDrizzleKit(root: string): boolean {
  return existsSync(join(root, "node_modules", "drizzle-kit", "bin.cjs"));
}

export function journalTags(root: string): string[] {
  const path = join(root, MIGRATIONS_DIR, "meta", "_journal.json");
  if (!existsSync(path)) return [];
  const journal = JSON.parse(readFileSync(path, "utf8")) as { entries?: { tag?: string }[] };
  return (journal.entries ?? []).map((entry) => entry.tag ?? "").filter((tag) => tag !== "");
}

/** De naam die drizzle-kit achter het volgnummer zet. Een koppelteken in een modulenaam wordt een liggend streepje. */
export function migrationName(moduleName: string, version: number, custom = false): string {
  return `template_${moduleName.replace(/-/g, "_")}_${version}${custom ? "_custom" : ""}`;
}

function runDrizzleKit(root: string, args: readonly string[]): { readonly ok: boolean; readonly output: string } {
  const result = spawnSync(process.execPath, ["node_modules/drizzle-kit/bin.cjs", ...args], {
    cwd: root,
    encoding: "utf8",
    timeout: TIMEOUT_MS,
    env: { ...process.env, DATABASE_URL: UNREACHABLE_URL, DATABASE_URL_UNPOOLED: UNREACHABLE_URL },
  });
  const output = `${result.stdout ?? ""}${result.stderr ?? ""}`.trim();
  if (result.error !== undefined) return { ok: false, output: `${output}\n${result.error.message}`.trim() };
  return { ok: result.status === 0, output };
}

/**
 * Het project heeft geen drift van zichzelf: `drizzle-kit generate` zonder naam mag niets opleveren.
 * Levert het wel iets op, dan staat die migratie nu in de werkmap en is dat de eerste zorg van het
 * project, niet van het template.
 */
export function assertNoDrift(root: string): void {
  if (!existsSync(join(root, MIGRATIONS_DIR, "meta", "_journal.json"))) {
    throw new DrizzleError(`${MIGRATIONS_DIR}/meta/_journal.json ontbreekt. Een project uit het template heeft de baseline-migraties; is deze map per ongeluk weggegooid?`);
  }
  const before = journalTags(root);
  const result = runDrizzleKit(root, ["generate"]);
  if (!result.ok) throw new DrizzleError(`drizzle-kit generate mislukte bij de driftcontrole:\n${result.output}`);
  const added = journalTags(root).filter((tag) => !before.includes(tag));
  if (added.length > 0) {
    throw new DrizzleError(
      `Het schema van dit project loopt voor op zijn migraties: drizzle-kit maakte zojuist ${added.join(", ")}. Bekijk die migratie, schrijf de terugweg in ${MIGRATIONS_DIR}/down/, commit, en draai pnpm template:apply daarna opnieuw.`,
    );
  }
}

/**
 * Eén schemaversie van één module: de gegenereerde migratie plus de terugweg, en als het manifest
 * dat zegt een custom migratie erachter. Staat de tag al in het journal (de lock was weg, of een
 * eerdere run stopte na het genereren), dan wordt er niets opnieuw gegenereerd en alleen de terugweg
 * aangevuld als die ontbreekt.
 */
export function generateModuleMigration(root: string, sourceRoot: string, moduleName: string, step: SchemaStep): GeneratedMigration[] {
  const results: GeneratedMigration[] = [];

  const generated = generateOne(root, migrationName(moduleName, step.version), null);
  if (generated !== undefined) {
    ensureDown(root, sourceRoot, generated.tag, step.down);
    results.push({ ...generated, kind: "generated" });
  }

  if (step.custom !== null) {
    if (step.customDown === null) throw new DrizzleError(`Module ${moduleName}, schemaversie ${step.version}: custom zonder customDown in het manifest.`);
    const custom = generateOne(root, migrationName(moduleName, step.version, true), readText(join(sourceRoot, step.custom)));
    if (custom === undefined) throw new DrizzleError(`drizzle-kit maakte geen custom migratie voor ${moduleName} ${step.version}.`);
    ensureDown(root, sourceRoot, custom.tag, step.customDown);
    results.push({ ...custom, kind: "custom" });
  }

  return results;
}

/** Eén aanroep van drizzle-kit, of de bestaande tag als die er al is. Undefined als er niets te genereren was. */
function generateOne(root: string, name: string, customSql: string | null): Omit<GeneratedMigration, "kind"> | undefined {
  const before = journalTags(root);
  const existing = before.find((tag) => tag.endsWith(`_${name}`));
  if (existing !== undefined) return { tag: existing, fresh: false };

  const args = customSql === null ? ["generate", `--name=${name}`] : ["generate", "--custom", `--name=${name}`];
  const result = runDrizzleKit(root, args);
  if (!result.ok) throw new DrizzleError(`drizzle-kit generate --name=${name} mislukte:\n${result.output}`);

  const added = journalTags(root).filter((tag) => !before.includes(tag));
  if (added.length > 1) throw new DrizzleError(`drizzle-kit maakte ${added.length} migraties voor ${name}; verwacht hoogstens één: ${added.join(", ")}`);
  const tag = added[0];
  if (tag === undefined) return undefined;

  if (customSql !== null) {
    writeText(join(root, MIGRATIONS_DIR, `${tag}.sql`), customSql.endsWith("\n") ? customSql : `${customSql}\n`);
  }
  return { tag, fresh: true };
}

function ensureDown(root: string, sourceRoot: string, tag: string, downSource: string): void {
  const target = join(root, MIGRATIONS_DIR, "down", `${tag}.sql`);
  if (existsSync(target)) return;
  const source = join(sourceRoot, downSource);
  if (!existsSync(source)) throw new DrizzleError(`De terugweg ${downSource} ontbreekt in het template.`);
  writeText(target, readText(source));
}
