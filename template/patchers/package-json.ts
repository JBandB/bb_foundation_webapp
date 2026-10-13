/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `package.json`: het template beheert zijn scripts en zijn pins, het project de rest.
 *
 * - Een beheerd script wordt gezet of teruggezet. Had het project het veranderd, dan staat dat in de
 *   waarschuwingen; wie een eigen variant wil, geeft hem een eigen naam.
 * - Een beheerde pin wint, met melding, tenzij het pakket in `template.skipDependencies` staat. Dan
 *   bepaalt het project de versie en zegt de patcher alleen wat het template verwacht.
 * - Scripts en pakketten die niet meer van het template zijn, blijven staan: een script wordt alleen
 *   verwijderd als het nog precies de oude templatewaarde heeft, een pakket nooit, want het project
 *   kan het zelf zijn gaan gebruiken.
 * - De uitkomst zegt of `pnpm install` nodig is, zodat de slottekst van apply dat kan noemen.
 */
import { parseJsonObject, sortedRecord, stringifyJson, withKeyOrder } from "../lib/json";
import { isPlainObject } from "../lib/dsl";
import type { PatchResult } from "./types";

export interface PackageJsonDesired {
  readonly packageManager: string;
  readonly engines: Readonly<Record<string, string>>;
  readonly scripts: Readonly<Record<string, string>>;
  readonly dependencies: Readonly<Record<string, string>>;
  readonly devDependencies: Readonly<Record<string, string>>;
}

/** Wat het template de vorige keer zette, uit de lock. */
export interface PackageJsonManaged {
  readonly scripts: Readonly<Record<string, string>>;
  readonly dependencies: Readonly<Record<string, string>>;
  readonly devDependencies: Readonly<Record<string, string>>;
}

export interface PackageJsonOptions {
  readonly skipDependencies: readonly string[];
  /** De naam voor een package.json die nog niet bestaat. */
  readonly name: string;
}

export interface PackageJsonResult extends PatchResult {
  readonly installNeeded: boolean;
  readonly managed: PackageJsonManaged;
}

const TOP_LEVEL_ORDER = ["name", "version", "private", "packageManager", "engines", "scripts", "dependencies", "devDependencies"];

export function patchPackageJson(text: string, desired: PackageJsonDesired, previous: PackageJsonManaged, options: PackageJsonOptions): PackageJsonResult {
  const changes: string[] = [];
  const warnings: string[] = [];
  const pkg = text.trim() === "" ? {} : parseJsonObject(text, "package.json");

  if (pkg.name === undefined) {
    pkg.name = options.name;
    changes.push(`name gezet op ${options.name}`);
  }
  if (pkg.version === undefined) pkg.version = "0.0.0";
  if (pkg.private !== true) {
    pkg.private = true;
    changes.push("private gezet op true, want dit pakket wordt nooit gepubliceerd");
  }
  if (pkg.packageManager !== desired.packageManager) {
    pkg.packageManager = desired.packageManager;
    changes.push(`packageManager gezet op ${desired.packageManager}`);
  }
  const engines = stringRecord(pkg.engines);
  for (const [engine, range] of Object.entries(desired.engines)) {
    if (engines[engine] !== range) {
      engines[engine] = range;
      changes.push(`engines.${engine} gezet op ${range}`);
    }
  }
  pkg.engines = engines;

  const scripts = stringRecord(pkg.scripts);
  for (const [name, command] of Object.entries(desired.scripts)) {
    const current = scripts[name];
    if (current === undefined) {
      scripts[name] = command;
      changes.push(`script ${name} toegevoegd`);
    } else if (current !== command) {
      const before = previous.scripts[name];
      if (before !== undefined && before !== current) {
        warnings.push(`script ${name} was door het project gewijzigd en is teruggezet naar de templatewaarde; geef een eigen variant een eigen naam`);
      }
      scripts[name] = command;
      changes.push(`script ${name} bijgewerkt`);
    }
  }
  for (const [name, before] of Object.entries(previous.scripts)) {
    if (desired.scripts[name] !== undefined) continue;
    const current = scripts[name];
    if (current === before) {
      delete scripts[name];
      changes.push(`script ${name} verwijderd (niet meer in het template)`);
    } else if (current !== undefined) {
      warnings.push(`script ${name} is niet meer van het template en was door het project gewijzigd; hij blijft staan`);
    }
  }
  pkg.scripts = scripts;

  const dependencies = stringRecord(pkg.dependencies);
  const devDependencies = stringRecord(pkg.devDependencies);
  let installNeeded = false;
  const managed = { scripts: { ...desired.scripts }, dependencies: {} as Record<string, string>, devDependencies: {} as Record<string, string> };

  const sync = (section: "dependencies" | "devDependencies", own: Record<string, string>, other: Record<string, string>): void => {
    for (const [name, version] of Object.entries(desired[section])) {
      if (other[name] !== undefined) {
        delete other[name];
        installNeeded = true;
        changes.push(`${name} verhuisd naar ${section}`);
      }
      const current = own[name];
      if (options.skipDependencies.includes(name)) {
        if (current === undefined) {
          own[name] = version;
          installNeeded = true;
          changes.push(`${name} ${version} toegevoegd aan ${section} (staat in template.skipDependencies, maar ontbrak)`);
        } else if (current !== version) {
          warnings.push(`${name}: het template verwacht ${version}, het project houdt ${current} (template.skipDependencies)`);
        }
        continue;
      }
      managed[section][name] = version;
      if (current === undefined) {
        own[name] = version;
        installNeeded = true;
        changes.push(`${name} ${version} toegevoegd aan ${section}`);
      } else if (current !== version) {
        const before = previous[section][name];
        if (before !== undefined && before !== current) {
          warnings.push(`${name} was door het project op ${current} gezet en is teruggezet naar ${version}; zet het pakket in template.skipDependencies als dat bewust was`);
        }
        own[name] = version;
        installNeeded = true;
        changes.push(`${name} van ${current} naar ${version} in ${section}`);
      }
    }
    for (const name of Object.keys(previous[section])) {
      if (desired[section][name] === undefined && own[name] !== undefined) {
        warnings.push(`${name} is niet meer van het template; het pakket blijft staan en het project bepaalt nu zelf de versie`);
      }
    }
  };
  sync("dependencies", dependencies, devDependencies);
  sync("devDependencies", devDependencies, dependencies);
  pkg.dependencies = sortedRecord(dependencies);
  pkg.devDependencies = sortedRecord(devDependencies);
  if (Object.keys(dependencies).length === 0) delete pkg.dependencies;
  if (Object.keys(devDependencies).length === 0) delete pkg.devDependencies;

  return { text: stringifyJson(withKeyOrder(pkg, TOP_LEVEL_ORDER)), changes, warnings, installNeeded, managed };
}

/** Een kopie van een sectie als record van strings; iets anders dan strings telt niet mee. */
function stringRecord(value: unknown): Record<string, string> {
  const record: Record<string, string> = {};
  if (!isPlainObject(value)) return record;
  for (const [key, item] of Object.entries(value)) if (typeof item === "string") record[key] = item;
  return record;
}
