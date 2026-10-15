/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het template toepassen op een project: de eerste keer, elke latere keer (herapply na een wijziging
 * in project.config.json) en vanuit template:update (met een kloon van een nieuwere versie als bron).
 *
 * Eén algoritme voor alle drie, en het is idempotent: twee keer draaien verandert de tweede keer
 * niets. Wat het doet, per klasse:
 *
 * - **owned**: overschrijven als het bestand in het project nog is wat het template er de vorige keer
 *   neerzette (de hash in de lock). Is het door het project gewijzigd, dan overslaan met een melding:
 *   `template:adopt` maakt het blijvend van het project, `--force` overschrijft met een kopie in
 *   `.template-backup/`. Een bestand dat ontbreekt komt terug.
 * - **generated**: als owned, met de uitvoer van de generatoren als bron.
 * - **seed**: één keer neerzetten en daarna met rust laten. Een seed die met de wortel van het template
 *   meekwam als neutrale standaard wordt bij de eerste echte apply opnieuw gerenderd, maar alleen als het
 *   project hem nog niet heeft aangeraakt.
 * - **merge**: de patchers voor package.json, vercel.json, .env.example, CLAUDE.md en .gitignore.
 *
 * Apply raakt nooit een database. Wat er daarna met de hand moet gebeuren, staat in de slottekst.
 */

import { existsSync, readFileSync, rmSync } from "node:fs";
import { join, relative } from "node:path";
import { generateAll } from "../generators";
import { generateSchemaIndex } from "../generators/schema-index";
import { patchClaudeMd } from "../patchers/claude-md";
import { patchEnvExample } from "../patchers/env-example";
import { patchGitignore } from "../patchers/gitignore";
import type { ManagedBlock } from "../patchers/managed-blocks";
import { patchPackageJson, type PackageJsonDesired } from "../patchers/package-json";
import { patchVercelJson, type Cron } from "../patchers/vercel-json";
import { normaliseConfig, readConfig } from "./config";
import type { ProjectConfig } from "./config-schema";
import { assertNoDrift, DrizzleError, generateModuleMigration, hasDrizzleKit, pendingSchemaSteps } from "./drizzle";
import { formatProblems, type Problem } from "./dsl";
import { fileExists, isBinaryPath, readBytes, readText, toPosix, walkFiles, writeBytes, writeText } from "./files";
import { isGitRepository, isWorkTreeDirty } from "./git";
import { emptyLock, hashBytes, hashText, readLock, serialiseLock, writeLock, type Lock, type LockedFile } from "./lock";
import { appliedModules, loadManifest, sourceOf, type FileClass, type FileEntry, type Manifest, type ModuleManifest } from "./manifest";
import { renderPlaceholders, todayIn, type PlaceholderContext } from "./placeholders";

export const DEFAULT_CONFIG_FILE = "template/default.project.config.json";
export const BACKUP_DIR = ".template-backup";

export interface ApplyOptions {
  readonly dryRun: boolean;
  readonly force: boolean;
  readonly allowDirty: boolean;
  readonly now: Date;
}

export type FileStatus =
  | "unchanged"
  | "created"
  | "restored"
  | "updated"
  | "forced"
  | "rendered"
  | "seed-kept"
  | "seed-newer"
  | "skipped-modified"
  | "adopted"
  | "removed";

export interface FileOutcome {
  readonly path: string;
  readonly module: string;
  readonly class: FileClass;
  readonly status: FileStatus;
  readonly note?: string;
}

export interface MergeOutcome {
  readonly file: string;
  readonly changes: readonly string[];
  readonly warnings: readonly string[];
}

export interface MigrationOutcome {
  readonly module: string;
  readonly version: number;
  readonly tag: string;
  readonly kind: "generated" | "custom";
  readonly fresh: boolean;
}

export interface ApplyResult {
  readonly config: ProjectConfig;
  readonly manifest: Manifest;
  readonly activeModules: readonly string[];
  readonly skippedModules: readonly string[];
  readonly outcomes: readonly FileOutcome[];
  readonly merges: readonly MergeOutcome[];
  readonly migrations: readonly MigrationOutcome[];
  /** Modules met een schemaversie die nog niet gegenereerd kon worden (geen node_modules, of een proefdraai). */
  readonly pendingSchema: readonly string[];
  readonly warnings: readonly string[];
  readonly installNeeded: boolean;
  readonly lock: Lock;
  readonly dryRun: boolean;
}

export class ApplyError extends Error {
  constructor(
    message: string,
    readonly problems: readonly Problem[] = [],
  ) {
    super(problems.length === 0 ? message : `${message}\n${formatProblems(problems)}`);
    this.name = "ApplyError";
  }
}

/** De standaardconfiguratie waarmee de seeds in de wortel van het template zijn gerenderd. */
export function readDefaultConfig(sourceRoot: string, manifest: Manifest): ProjectConfig {
  const path = join(sourceRoot, DEFAULT_CONFIG_FILE);
  if (!existsSync(path)) throw new ApplyError(`${DEFAULT_CONFIG_FILE} ontbreekt in ${sourceRoot}; dit is geen volledige kopie van het template.`);
  const report = normaliseConfig(JSON.parse(readFileSync(path, "utf8")), manifest);
  if (report.config === undefined) throw new ApplyError(`${DEFAULT_CONFIG_FILE} is niet geldig`, report.errors);
  return report.config;
}

/** Twee genormaliseerde configuraties met dezelfde inhoud, ongeacht de volgorde van sleutels. */
export function configsEqual(a: ProjectConfig, b: ProjectConfig): boolean {
  return JSON.stringify(sortKeys(a)) === JSON.stringify(sortKeys(b));
}

function sortKeys(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .sort(([x], [y]) => (x < y ? -1 : x > y ? 1 : 0))
      .map(([key, item]) => [key, sortKeys(item)]),
  );
}

/**
 * Past het template toe. `root` is het project, `sourceRoot` is waar de bronnen van het template
 * staan: het project zelf bij apply, een kloon van een nieuwere versie bij update.
 */
export function applyTemplate(root: string, sourceRoot: string, options: ApplyOptions): ApplyResult {
  const manifest = loadManifest(sourceRoot);
  const report = readConfig(root, manifest);
  if (report.config === undefined) throw new ApplyError("project.config.json is niet geldig:", report.errors);
  const config = report.config;
  const warnings: string[] = report.warnings.map((problem) => `project.config.json ${problem.path}: ${problem.message}`);

  if (!options.dryRun && !options.allowDirty && isGitRepository(root) && isWorkTreeDirty(root)) {
    throw new ApplyError(
      "De werkmap heeft wijzigingen die nog niet gecommit zijn. Commit (of stash) ze eerst, zodat je in git kunt zien wat apply verandert. Wil je toch doorgaan: --allow-dirty.",
    );
  }

  const applied = appliedModules(manifest, config.modules);
  const skippedModules = applied.filter((name) => manifest.modules[name]?.status !== null);
  const activeModules = applied.filter((name) => !skippedModules.includes(name));

  const previousLock = readLock(root);
  const source = config.template.source ?? manifest.source ?? previousLock?.source ?? null;
  const lock = emptyLock(manifest.version, source, options.now.toISOString().replace(/\.\d{3}Z$/, "Z"));
  const files: Record<string, LockedFile> = {};
  const adopted = previousLock?.adopted ?? [];

  const defaultConfig = readDefaultConfig(sourceRoot, manifest);
  /* Op de standaardconfiguratie blijven de seeds de neutrale versie: er is nog niets om voor te renderen. */
  const onDefaultConfig = configsEqual(config, defaultConfig);
  if (onDefaultConfig) {
    warnings.push("project.config.json is nog de standaardconfiguratie van het template. Zet de uitvoer van de wizard erover en draai apply opnieuw; dan worden README, SPEC, ROADMAP en de rechtenmatrix voor dit project gerenderd.");
  }
  const today = todayIn(config.project.timezone, options.now);
  const context: PlaceholderContext = { config, today, templateVersion: manifest.version, templateSource: source };
  const defaultContext: PlaceholderContext = { config: defaultConfig, today: manifest.rootRenderedOn, templateVersion: manifest.version, templateSource: null };

  const generated = new Map(generateAll(config, manifest).map((file) => [file.path, file.content]));
  /*
   * Zonder lock (iemand gooide hem weg) is er toch een maat voor "niet aangeraakt": wat de wortel van
   * het template meeleverde. Voor een gegenereerd bestand is dat de uitvoer voor de standaardconfig;
   * voor de gedeelde bestanden alles wat welke module dan ook beheert, want die blokken, crons en
   * scripts schrijft alleen het template.
   */
  const shippedGenerated = previousLock === undefined ? new Map(generateAll(defaultConfig, manifest).map((file) => [file.path, file.content])) : new Map<string, string>();
  const allModules = Object.keys(manifest.modules);
  const allParts = allModules.map((name) => manifest.modules[name]?.merge.packageJson).filter((part) => part !== undefined);
  const shippedMerged = {
    packageJson: {
      scripts: Object.assign({}, ...allParts.map((part) => part.scripts)) as Record<string, string>,
      dependencies: Object.assign({}, ...allParts.map((part) => part.dependencies)) as Record<string, string>,
      devDependencies: Object.assign({}, ...allParts.map((part) => part.devDependencies)) as Record<string, string>,
    },
    vercelCrons: allModules.flatMap((name) => manifest.modules[name]?.merge.vercelJson.crons.map((cron) => cron.path) ?? []),
    blocks: allModules,
  };
  const outcomes: FileOutcome[] = [];

  const writeFile = (path: string, content: string | Uint8Array): void => {
    if (options.dryRun) return;
    if (typeof content === "string") writeText(join(root, path), content);
    else writeBytes(join(root, path), content);
  };

  const backup = (path: string): void => {
    if (options.dryRun) return;
    const target = join(root, path);
    if (!fileExists(target)) return;
    writeBytes(join(root, BACKUP_DIR, path), readBytes(target));
  };

  const hashOf = (path: string): string => {
    const target = join(root, path);
    return isBinaryPath(path) ? hashBytes(readBytes(target)) : hashText(readText(target));
  };

  /** Een owned of generated bestand: de bron wint als het project het niet heeft aangeraakt. */
  const processOwned = (path: string, content: string | Uint8Array, module: string, cls: FileClass): void => {
    if (adopted.includes(path)) {
      outcomes.push({ path, module, class: cls, status: "adopted" });
      return;
    }
    const previous = previousLock?.files[path];
    const newHash = typeof content === "string" ? hashText(content) : hashBytes(content);
    const exists = fileExists(join(root, path));

    if (!exists) {
      writeFile(path, content);
      files[path] = { module, class: cls, hash: newHash, seeded: false, seededIn: null, sourceHash: null, shippedHash: null };
      outcomes.push({ path, module, class: cls, status: previous === undefined ? "created" : "restored" });
      return;
    }

    const currentHash = hashOf(path);
    if (currentHash === newHash) {
      files[path] = { module, class: cls, hash: newHash, seeded: false, seededIn: null, sourceHash: null, shippedHash: null };
      outcomes.push({ path, module, class: cls, status: "unchanged" });
      return;
    }

    const shipped = shippedGenerated.get(path);
    const untouched =
      ownHashes.get(path) === currentHash || (previous !== undefined ? previous.hash === currentHash : shipped !== undefined && hashText(shipped) === currentHash);
    if (untouched || options.force) {
      if (!untouched) backup(path);
      writeFile(path, content);
      files[path] = { module, class: cls, hash: newHash, seeded: false, seededIn: null, sourceHash: null, shippedHash: null };
      outcomes.push({ path, module, class: cls, status: untouched ? "updated" : "forced", ...(untouched ? {} : { note: `kopie in ${BACKUP_DIR}/${path}` }) });
      return;
    }

    files[path] = { module, class: cls, hash: previous?.hash ?? newHash, seeded: false, seededIn: null, sourceHash: null, shippedHash: null };
    outcomes.push({
      path,
      module,
      class: cls,
      status: "skipped-modified",
      note: previous === undefined ? "wijkt af van het template en staat niet in de lock; template:adopt om het van het project te maken, of --force" : "door het project gewijzigd; template:adopt om dit blijvend te maken, of --force om te overschrijven",
    });
  };

  /** Een seed: één keer neerzetten, daarna van het project. */
  const processSeed = (entry: FileEntry, module: string, moduleManifest: ModuleManifest): void => {
    const path = entry.to;
    if (adopted.includes(path)) {
      outcomes.push({ path, module, class: "seed", status: "adopted" });
      return;
    }
    const sourcePath = join(sourceRoot, sourceOf(module, moduleManifest, entry));
    if (!fileExists(sourcePath)) throw new ApplyError(`De bron van seed ${path} ontbreekt in het template: ${toPosix(relative(sourceRoot, sourcePath))}`);
    const previous = previousLock?.files[path];

    if (isBinaryPath(path)) {
      const bytes = readBytes(sourcePath);
      if (!fileExists(join(root, path))) {
        writeFile(path, bytes);
        files[path] = { module, class: "seed", hash: hashBytes(bytes), seeded: true, seededIn: manifest.version, sourceHash: hashBytes(bytes), shippedHash: null };
        outcomes.push({ path, module, class: "seed", status: "rendered" });
      } else {
        files[path] = { module, class: "seed", hash: hashOf(path), seeded: true, seededIn: previous?.seededIn ?? manifest.version, sourceHash: hashBytes(bytes), shippedHash: null };
        outcomes.push({ path, module, class: "seed", status: "seed-kept" });
      }
      return;
    }

    const sourceText = readText(sourcePath);
    const sourceHash = hashText(sourceText);
    const rendered = entry.placeholders ? renderPlaceholders(sourceText, context, path) : sourceText;
    const shipped = entry.placeholders ? renderPlaceholders(sourceText, defaultContext, path) : sourceText;
    const renderedHash = hashText(rendered);
    const shippedHash = hashText(shipped);

    if (!fileExists(join(root, path))) {
      writeFile(path, rendered);
      files[path] = { module, class: "seed", hash: renderedHash, seeded: true, seededIn: manifest.version, sourceHash, shippedHash: null };
      outcomes.push({ path, module, class: "seed", status: "rendered" });
      return;
    }

    const currentHash = hashOf(path);

    if (previous?.seeded === true) {
      files[path] = { ...previous, module, class: "seed", hash: currentHash };
      const newer = previous.sourceHash !== null && previous.sourceHash !== sourceHash;
      outcomes.push({ path, module, class: "seed", status: newer ? "seed-newer" : "seed-kept", ...(newer ? { note: `de opzet in het template is veranderd; vergelijk met ${toPosix(relative(sourceRoot, sourcePath))}` } : {}) });
      return;
    }

    if (currentHash === shippedHash) {
      if (renderedHash !== shippedHash && !onDefaultConfig) {
        writeFile(path, rendered);
        files[path] = { module, class: "seed", hash: renderedHash, seeded: true, seededIn: manifest.version, sourceHash, shippedHash: null };
        outcomes.push({ path, module, class: "seed", status: "rendered", note: "de neutrale standaard is vervangen door de inhoud voor dit project" });
      } else {
        files[path] = { module, class: "seed", hash: currentHash, seeded: false, seededIn: null, sourceHash, shippedHash };
        outcomes.push({ path, module, class: "seed", status: "unchanged" });
      }
      return;
    }

    /* Al door het project aangepast, ook al stond het nog niet in de lock: dan is het van het project. */
    files[path] = { module, class: "seed", hash: currentHash, seeded: true, seededIn: previous?.seededIn ?? manifest.version, sourceHash, shippedHash: null };
    outcomes.push({ path, module, class: "seed", status: "seed-kept" });
  };

  /*
   * Modules met een nieuwe schemaversie: eerst bewijzen dat het project zelf geen drift heeft, met een
   * schema-index zonder die modules. Daarna schrijft de lus de volledige index en genereert de staart
   * van apply de migraties. Wat apply hier zelf schrijft, telt straks als "niet aangeraakt".
   */
  const ownHashes = new Map<string, string>();
  const schemaPending = activeModules.filter((name) => {
    const moduleManifest = manifest.modules[name];
    return moduleManifest !== undefined && moduleManifest.schemaFiles.length > 0 && pendingSchemaSteps(moduleManifest, previousLock?.modules[name]?.schemaVersion ?? 0).length > 0;
  });
  const canGenerate = schemaPending.length > 0 && !options.dryRun && hasDrizzleKit(root);
  if (canGenerate) {
    const indexPath = "lib/db/schema/template-index.ts";
    const settled = generateSchemaIndex(manifest, applied.filter((name) => !schemaPending.includes(name)));
    writeText(join(root, indexPath), settled);
    ownHashes.set(indexPath, hashText(settled));
    try {
      assertNoDrift(root);
    } catch (error) {
      if (error instanceof DrizzleError) throw new ApplyError(error.message);
      throw error;
    }
  }

  for (const name of activeModules) {
    const moduleManifest = manifest.modules[name];
    if (moduleManifest === undefined) continue;

    for (const entry of moduleManifest.files) {
      if (entry.class === "seed") {
        processSeed(entry, name, moduleManifest);
        continue;
      }
      if (entry.class === "generated") {
        const content = generated.get(entry.to);
        if (content === undefined) throw new ApplyError(`Geen generator voor ${entry.to} (${entry.generator ?? "onbekend"})`);
        processOwned(entry.to, content, name, "generated");
        continue;
      }
      if (entry.tree) {
        const sourceDir = join(sourceRoot, sourceOf(name, moduleManifest, entry));
        if (!existsSync(sourceDir)) throw new ApplyError(`De map ${entry.to} ontbreekt in het template.`);
        for (const rel of walkFiles(sourceDir)) {
          const path = `${entry.to}${rel}`;
          const sourceFile = join(sourceDir, rel);
          processOwned(path, isBinaryPath(path) ? readBytes(sourceFile) : readText(sourceFile), name, "owned");
        }
        continue;
      }
      const sourceFile = join(sourceRoot, sourceOf(name, moduleManifest, entry));
      if (!fileExists(sourceFile)) throw new ApplyError(`De bron van ${entry.to} ontbreekt in het template: ${toPosix(relative(sourceRoot, sourceFile))}`);
      processOwned(entry.to, isBinaryPath(entry.to) ? readBytes(sourceFile) : readText(sourceFile), name, "owned");
    }
  }

  /* Bestanden die het template de vorige keer beheerde en nu niet meer: weg, als het project ze niet heeft aangeraakt. */
  for (const [path, previous] of Object.entries(previousLock?.files ?? {})) {
    if (files[path] !== undefined || adopted.includes(path)) continue;
    if (previous.class === "seed") continue;
    if (!fileExists(join(root, path))) continue;
    if (hashOf(path) === previous.hash) {
      if (!options.dryRun) removeFile(root, path);
      outcomes.push({ path, module: previous.module, class: previous.class, status: "removed", note: "niet meer in het template" });
    } else {
      outcomes.push({ path, module: previous.module, class: previous.class, status: "skipped-modified", note: "niet meer in het template, maar door het project gewijzigd; verwijder hem zelf als hij weg mag" });
    }
  }

  /* De gedeelde bestanden. */
  const merges: MergeOutcome[] = [];
  let installNeeded = false;
  const merged = { ...lock.merged };

  const packageParts = activeModules.map((name) => manifest.modules[name]?.merge.packageJson).filter((part) => part !== undefined);
  const desiredPackage: PackageJsonDesired = {
    packageManager: packageParts.map((part) => part.packageManager).find((value) => value !== null) ?? "",
    engines: Object.assign({}, ...packageParts.map((part) => part.engines)) as Record<string, string>,
    scripts: Object.assign({}, ...packageParts.map((part) => part.scripts)) as Record<string, string>,
    dependencies: Object.assign({}, ...packageParts.map((part) => part.dependencies)) as Record<string, string>,
    devDependencies: Object.assign({}, ...packageParts.map((part) => part.devDependencies)) as Record<string, string>,
  };
  const packagePath = join(root, "package.json");
  const packageText = fileExists(packagePath) ? readText(packagePath) : "";
  const packageResult = patchPackageJson(packageText, desiredPackage, previousLock?.merged.packageJson ?? shippedMerged.packageJson, {
    skipDependencies: [...config.template.skipDependencies],
    name: config.project.slug,
  });
  if (packageResult.text !== packageText) writeFile("package.json", packageResult.text);
  installNeeded = packageResult.installNeeded || !existsSync(join(root, "node_modules"));
  merges.push({ file: "package.json", changes: packageResult.changes, warnings: packageResult.warnings });
  merged.packageJson = packageResult.managed;

  const crons: Cron[] = activeModules.flatMap((name) => manifest.modules[name]?.merge.vercelJson.crons ?? []);
  const vercelPath = join(root, "vercel.json");
  const vercelText = fileExists(vercelPath) ? readText(vercelPath) : "";
  /*
   * De build migreert eerst (SPEC D5, les L-VRC-01): zonder `buildCommand` draait Vercel alleen
   * `next build`, en dan migreert noch productie noch een preview. Een standaardwaarde, dus een
   * project dat zelf een buildCommand heeft, houdt het zijne.
   */
  const vercelResult = patchVercelJson(
    vercelText,
    { defaults: { regions: [config.hosting.region], buildCommand: "pnpm db:deploy && pnpm build" }, crons },
    previousLock?.merged.vercelCrons ?? shippedMerged.vercelCrons,
    [...config.template.keepCrons],
  );
  if (vercelResult.text !== vercelText) writeFile("vercel.json", vercelResult.text);
  merges.push({ file: "vercel.json", changes: vercelResult.changes, warnings: vercelResult.warnings });
  merged.vercelCrons = vercelResult.managedCrons;

  const blocksFor = (key: "envExample" | "claudeMd" | "gitignore"): ManagedBlock[] =>
    activeModules.flatMap((name) => {
      const path = manifest.modules[name]?.merge[key];
      if (path === null || path === undefined) return [];
      const full = join(sourceRoot, path);
      if (!fileExists(full)) throw new ApplyError(`Het blok ${path} van module ${name} ontbreekt in het template.`);
      return [{ name, body: readText(full) }];
    });

  const envPath = join(root, ".env.example");
  const envText = fileExists(envPath) ? readText(envPath) : "";
  const envResult = patchEnvExample(envText, blocksFor("envExample"), previousLock?.merged.envBlocks ?? shippedMerged.blocks);
  if (envResult.text !== envText) writeFile(".env.example", envResult.text);
  merges.push({ file: ".env.example", changes: envResult.changes, warnings: envResult.warnings });
  merged.envBlocks = envResult.managed;

  const claudePath = join(root, "CLAUDE.md");
  const claudeText = fileExists(claudePath) ? readText(claudePath) : "";
  const claudeResult = patchClaudeMd(claudeText, blocksFor("claudeMd"), previousLock?.merged.claudeBlocks ?? shippedMerged.blocks);
  if (claudeResult.text !== claudeText) writeFile("CLAUDE.md", claudeResult.text);
  merges.push({ file: "CLAUDE.md", changes: claudeResult.changes, warnings: claudeResult.warnings });
  merged.claudeBlocks = claudeResult.managed;

  const gitignorePath = join(root, ".gitignore");
  const gitignoreText = fileExists(gitignorePath) ? readText(gitignorePath) : "";
  const gitignoreResult = patchGitignore(gitignoreText, blocksFor("gitignore"), previousLock?.merged.gitignoreBlocks ?? shippedMerged.blocks);
  if (gitignoreResult.text !== gitignoreText) writeFile(".gitignore", gitignoreResult.text);
  merges.push({ file: ".gitignore", changes: gitignoreResult.changes, warnings: gitignoreResult.warnings });
  merged.gitignoreBlocks = gitignoreResult.managed;

  /*
   * De schemaversies van de modules met een database. De baseline van core reist met de wortel mee;
   * elke andere versie wordt hier in het project gegenereerd, zie template/lib/drizzle.ts.
   */
  const modules: Record<string, { schemaVersion: number; migrations: string[] }> = {};
  const migrationOutcomes: MigrationOutcome[] = [];
  const pendingSchema: string[] = [];
  /*
   * Eén migratie per module, met alleen de tabellen van die module erin: tijdens het genereren noemt
   * de schema-index de modules die al een schema hebben plus de module die aan de beurt is, en
   * daarna komt de volledige index terug. Anders belandt de tweede module in de migratie van de
   * eerste en heeft ze zelf niets meer te genereren, met een terugweg die niet klopt.
   */
  const indexPath = "lib/db/schema/template-index.ts";
  const included = applied.filter((name) => !schemaPending.includes(name));
  for (const name of activeModules) {
    const moduleManifest = manifest.modules[name];
    if (moduleManifest === undefined || moduleManifest.schemaFiles.length === 0) continue;
    const previous = previousLock?.modules[name];
    const appliedVersion = previous?.schemaVersion ?? 0;
    const tags = [...(previous?.migrations ?? [])];
    const steps = pendingSchemaSteps(moduleManifest, appliedVersion);
    let reached = steps.length === 0 ? moduleManifest.schemaVersion : appliedVersion;

    if (steps.length > 0 && options.dryRun) {
      pendingSchema.push(name);
      warnings.push(`Module ${name}: apply zou de migratie voor schemaversie ${steps.map((step) => step.version).join(", ")} genereren.`);
    } else if (steps.length > 0 && !hasDrizzleKit(root)) {
      pendingSchema.push(name);
      warnings.push(`Module ${name} heeft een databaseschema (versie ${moduleManifest.schemaVersion}), maar node_modules ontbreekt nog. Draai pnpm install en daarna pnpm template:apply opnieuw; dan wordt de migratie gegenereerd.`);
    } else if (steps.length > 0) {
      if (!included.includes(name)) included.push(name);
      writeText(join(root, indexPath), generateSchemaIndex(manifest, applied.filter((candidate) => included.includes(candidate))));
      for (const step of steps) {
        let generated;
        try {
          generated = generateModuleMigration(root, sourceRoot, name, step);
        } catch (error) {
          if (error instanceof DrizzleError) throw new ApplyError(`Module ${name}, schemaversie ${step.version}: ${error.message}`);
          throw error;
        }
        if (generated.length === 0) {
          warnings.push(`Module ${name}, schemaversie ${step.version}: drizzle-kit zag geen schemawijziging en maakte geen migratie. Dat klopt alleen als de tabellen er al stonden.`);
        }
        for (const migration of generated) {
          if (!tags.includes(migration.tag)) tags.push(migration.tag);
          migrationOutcomes.push({ module: name, version: step.version, ...migration });
        }
        reached = step.version;
      }
    }
    modules[name] = { schemaVersion: reached, migrations: tags };
  }
  /* De volledige index terug, precies zoals de lus hem schreef en de lock hem kent. */
  const fullIndex = generated.get(indexPath);
  if (migrationOutcomes.some((migration) => migration.fresh) && fullIndex !== undefined) writeText(join(root, indexPath), fullIndex);

  /*
   * Het genereren schreef in het journal en de snapshots, en die staan als seeds van core in de lock
   * met de hash van vóór het genereren. Zet ze nu zoals de volgende apply ze zou zien: van het project
   * (seeded), met de huidige inhoud als bron. Anders geeft de volgende apply een diff in de lock.
   */
  if (migrationOutcomes.some((migration) => migration.fresh)) {
    for (const [path, entry] of Object.entries(files)) {
      if (!path.startsWith("lib/db/migrations/") || entry.class !== "seed" || !fileExists(join(root, path))) continue;
      const current = hashOf(path);
      if (current === entry.hash) continue;
      files[path] = { ...entry, hash: current, seeded: true, seededIn: entry.seededIn ?? manifest.version, sourceHash: current, shippedHash: null };
    }
  }

  /* Alleen het tijdstip is anders? Dan is er niets gebeurd en blijft de lock letterlijk gelijk, zodat een tweede apply geen diff geeft. */
  const candidate: Lock = { ...lock, files, modules, merged, adopted: [...adopted] };
  const finalLock: Lock =
    previousLock !== undefined && serialiseLock({ ...candidate, appliedAt: previousLock.appliedAt }) === serialiseLock(previousLock)
      ? { ...candidate, appliedAt: previousLock.appliedAt }
      : candidate;
  if (!options.dryRun && (previousLock === undefined || serialiseLock(finalLock) !== serialiseLock(previousLock))) writeLock(root, finalLock);

  return { config, manifest, activeModules, skippedModules, outcomes, merges, migrations: migrationOutcomes, pendingSchema, warnings, installNeeded, lock: finalLock, dryRun: options.dryRun };
}

function removeFile(root: string, path: string): void {
  const target = join(root, path);
  if (!fileExists(target)) return;
  /* Eerst een kopie in de backup-map, zodat niets echt weg is tot de mens dat zelf doet. */
  writeBytes(join(root, BACKUP_DIR, path), readBytes(target));
  rmSync(target);
}
