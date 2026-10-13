/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De zelftest van het template: de wortel van deze repo is een project met de standaardconfiguratie,
 * en alles wat de tooling over een project beweert moet hier kloppen. Elk bestand uit het manifest
 * bestaat, draagt de juiste kop, de seeds in de wortel zijn precies wat de seedbronnen renderen, de
 * gedeelde bestanden zijn een vast punt van hun patcher, en het JSON Schema loopt niet achter op de
 * code. Faalt dit, dan is het template zelf niet wat het belooft.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { renderSchemaFile, SCHEMA_FILE } from "./cli/schema";
import { generateAll } from "./generators";
import { configsEqual, DEFAULT_CONFIG_FILE, readDefaultConfig } from "./lib/apply";
import { readConfig } from "./lib/config";
import { isPlainObject } from "./lib/dsl";
import { directoryExists, fileExists, isBinaryPath, readText, walkFiles } from "./lib/files";
import { commentStyleFor, readHeader } from "./lib/header";
import { appliedModules, loadManifest, sourceOf, type FileEntry, type ModuleManifest } from "./lib/manifest";
import { renderPlaceholders } from "./lib/placeholders";
import { patchClaudeMd } from "./patchers/claude-md";
import { patchEnvExample } from "./patchers/env-example";
import { patchGitignore } from "./patchers/gitignore";
import { type ManagedBlock } from "./patchers/managed-blocks";
import { patchPackageJson } from "./patchers/package-json";
import { patchVercelJson } from "./patchers/vercel-json";

const root = process.cwd();
const manifest = loadManifest(root);
const report = readConfig(root, manifest);
const config = report.config;
if (config === undefined) throw new Error(`project.config.json van het template is niet geldig: ${JSON.stringify(report.errors)}`);
const modules = appliedModules(manifest, config.modules);

/**
 * In de repo van het template staat de standaardconfiguratie en zijn de seeds de neutrale versie. In
 * een project dat uit het template komt draait deze test ook (template/ reist mee), maar daar staat
 * een echte configuratie en zijn de seeds gerenderd: de beweringen die alleen over de wortel van het
 * template gaan, slaan dan over. Wat in een project moet kloppen, bewijst pnpm template:verify.
 */
const onDefaultConfig = configsEqual(config, readDefaultConfig(root, manifest));

/**
 * Welke bestanden een kop moeten dragen: alles met een commentaarvorm, behalve wat letterlijk in een
 * project belandt zonder van het template te blijven: seedbronnen, blokfragmenten en de terugwegen
 * van migraties (die worden naast de gegenereerde migratie gezet en zijn daarna van het project).
 */
function expectsHeader(path: string): boolean {
  if (isBinaryPath(path) || commentStyleFor(path) === undefined) return false;
  if (path.startsWith("template/modules/") && (path.includes("/seed/") || path.includes("/migrations/") || path.endsWith("/claude.md"))) return false;
  return true;
}

function blocksFor(key: "claudeMd" | "envExample" | "gitignore"): ManagedBlock[] {
  return modules.flatMap((name) => {
    const path = manifest.modules[name]?.merge[key];
    return path === null || path === undefined ? [] : [{ name, body: readText(join(root, path)) }];
  });
}

describe("het manifest en de wortel", () => {
  it.skipIf(!onDefaultConfig)("de wortel past core en de standaardinlogmodule toe", () => {
    expect(modules).toEqual(["core", "auth-entra"]);
  });

  const entries = modules.flatMap((name) => {
    const found = manifest.modules[name];
    return found === undefined ? [] : found.files.map((entry) => ({ name, module: found, entry }));
  });

  it.each(entries.map(({ name, module, entry }) => [entry.to, name, module, entry] as const))("%s bestaat met de juiste kop", (to, name, module: ModuleManifest, entry: FileEntry) => {
    const source = join(root, sourceOf(name, module, entry));
    if (entry.tree) {
      expect(directoryExists(join(root, to))).toBe(true);
      for (const file of walkFiles(join(root, to)).map((rel) => `${to}${rel}`)) {
        if (!expectsHeader(file)) continue;
        const header = readHeader(readText(join(root, file)));
        expect(header, `${file} mist de kop template-owned`).toBeDefined();
        expect(header?.kind, `${file} hoort owned te zijn`).toBe("owned");
        if (header?.kind === "owned") expect(Object.keys(manifest.modules), `${file} noemt een onbekende module`).toContain(header.module);
      }
      return;
    }

    expect(fileExists(join(root, to)), `${to} ontbreekt`).toBe(true);
    if (entry.placeholders) expect(fileExists(source), `seedbron ${source} ontbreekt`).toBe(true);
    if (!expectsHeader(to)) return;

    const header = readHeader(readText(join(root, to)));
    if (entry.class === "seed") {
      expect(header, `${to} is een seed en hoort geen kop te dragen`).toBeUndefined();
    } else if (entry.class === "generated") {
      expect(header).toEqual({ kind: "generated", generator: entry.generator });
    } else {
      expect(header).toEqual({ kind: "owned", module: name });
    }
  });

  it.skipIf(!onDefaultConfig)("elke seed met placeholders rendert met de standaardconfig precies naar de wortel", () => {
    const context = { config, today: manifest.rootRenderedOn, templateVersion: manifest.version, templateSource: manifest.source };
    for (const { name, module, entry } of entries) {
      if (!entry.placeholders) continue;
      const source = readText(join(root, sourceOf(name, module, entry)));
      expect(renderPlaceholders(source, context, entry.to), `${entry.to} wijkt af van zijn seedbron`).toBe(readText(join(root, entry.to)));
    }
  });

  /**
   * De opt-in modules staan niet in de wortel, dus de lus hierboven ziet ze niet. Hun bronnen onder
   * template/modules/<naam>/ moeten er wel zijn, met de kop van hun eigen module, anders strandt de
   * eerste apply die ze kiest.
   */
  /* Alleen modules met bronnen onder template/modules/: een inRoot-module die niet is toegepast, is uit de boom gehaald. */
  const optIn = Object.entries(manifest.modules).filter(([name, found]) => found.status === null && !found.inRoot && !modules.includes(name));
  it.each(optIn.map(([name, found]) => [name, found] as const))("de bronnen van module %s bestaan met de juiste kop", (name, found: ModuleManifest) => {
    expect(found.files.length, `module ${name} heeft geen bestanden`).toBeGreaterThan(0);
    for (const entry of found.files) {
      const source = join(root, sourceOf(name, found, entry));
      expect(fileExists(source), `${sourceOf(name, found, entry)} ontbreekt`).toBe(true);
      if (!expectsHeader(entry.to) || entry.class === "seed") continue;
      expect(readHeader(readText(source)), entry.to).toEqual({ kind: "owned", module: name });
    }
    for (const [version, migration] of Object.entries(found.migrations)) {
      for (const path of [migration.down, migration.custom, migration.customDown]) {
        if (path !== null) expect(existsSync(join(root, path)), `module ${name}, schemaversie ${version}: ${path} ontbreekt`).toBe(true);
      }
    }
    if (found.schemaFiles.length > 0) {
      expect(Object.keys(found.migrations), `module ${name} heeft een schema maar geen migratie in het manifest`).toContain(String(found.schemaVersion));
    }
  });

  it("elke blokbron uit het manifest bestaat", () => {
    for (const name of Object.keys(manifest.modules)) {
      const merge = manifest.modules[name]?.merge;
      for (const path of [merge?.claudeMd, merge?.envExample, merge?.gitignore]) {
        if (path !== null && path !== undefined) expect(existsSync(join(root, path)), `${path} ontbreekt`).toBe(true);
      }
    }
  });
});

describe("de gedeelde bestanden zijn een vast punt van hun patcher", () => {
  it("CLAUDE.md", () => {
    const blocks = blocksFor("claudeMd");
    const result = patchClaudeMd(readText(join(root, "CLAUDE.md")), blocks, blocks.map((block) => block.name));
    expect(result.changes).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.text).toBe(readText(join(root, "CLAUDE.md")));
  });

  it(".env.example", () => {
    const blocks = blocksFor("envExample");
    const result = patchEnvExample(readText(join(root, ".env.example")), blocks, blocks.map((block) => block.name));
    expect(result.changes).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.text).toBe(readText(join(root, ".env.example")));
  });

  it(".gitignore", () => {
    const blocks = blocksFor("gitignore");
    const result = patchGitignore(readText(join(root, ".gitignore")), blocks, blocks.map((block) => block.name));
    expect(result.changes).toEqual([]);
    expect(result.text).toBe(readText(join(root, ".gitignore")));
  });

  it("package.json", () => {
    const merged = modules.map((name) => manifest.modules[name]?.merge.packageJson).filter((part) => part !== undefined);
    const desired = {
      packageManager: merged.map((part) => part.packageManager).find((value) => value !== null) ?? "",
      engines: Object.assign({}, ...merged.map((part) => part.engines)) as Record<string, string>,
      scripts: Object.assign({}, ...merged.map((part) => part.scripts)) as Record<string, string>,
      dependencies: Object.assign({}, ...merged.map((part) => part.dependencies)) as Record<string, string>,
      devDependencies: Object.assign({}, ...merged.map((part) => part.devDependencies)) as Record<string, string>,
    };
    const text = readText(join(root, "package.json"));
    const result = patchPackageJson(text, desired, desired, { skipDependencies: [...config.template.skipDependencies], name: config.project.slug });
    expect(result.changes).toEqual([]);
    expect(result.warnings).toEqual([]);
    expect(result.text).toBe(text);
  });

  it("vercel.json", () => {
    const crons = modules.flatMap((name) => manifest.modules[name]?.merge.vercelJson.crons ?? []);
    const text = readText(join(root, "vercel.json"));
    const result = patchVercelJson(text, { defaults: { regions: [config.hosting.region] }, crons }, crons.map((cron) => cron.path), [...config.template.keepCrons]);
    expect(result.changes).toEqual([]);
    expect(result.text).toBe(text);
  });
});

describe("de gegenereerde bestanden", () => {
  const generated = generateAll(config, manifest);

  it("zijn precies wat de generatoren uit de configuratie maken (anders: pnpm template:generate)", () => {
    for (const file of generated) expect(readText(join(root, file.path)), file.path).toBe(file.content);
  });

  it("staan allemaal als generated in het manifest, en andersom", () => {
    const inManifest = Object.values(manifest.modules)
      .flatMap((module) => module.files)
      .filter((entry) => entry.class === "generated")
      .map((entry) => entry.to)
      .sort();
    expect(generated.map((file) => file.path).sort()).toEqual(inManifest);
  });
});

describe("de configuratie en het schema", () => {
  const strip = (value: unknown): unknown => {
    if (!isPlainObject(value)) return value;
    const copy = { ...value };
    delete copy.$schema;
    return copy;
  };
  const read = (path: string): unknown => strip(JSON.parse(readFileSync(join(root, path), "utf8")));

  it.skipIf(!onDefaultConfig)("project.config.json in de wortel is het standaardvoorbeeld", () => {
    expect(read("project.config.json")).toEqual(read("examples/default.project.config.json"));
  });

  it("de standaardconfiguratie van de tooling is hetzelfde standaardvoorbeeld", () => {
    expect(read(DEFAULT_CONFIG_FILE)).toEqual(read("examples/default.project.config.json"));
  });

  it("het JSON Schema op schijf is wat de schemataal nu oplevert (anders: pnpm template:schema)", () => {
    expect(readText(join(root, SCHEMA_FILE))).toBe(renderSchemaFile());
  });
});
