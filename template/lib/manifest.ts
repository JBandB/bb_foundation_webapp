/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het manifest van het template (`template/manifest.json`): de versie, de bron en per module wat
 * hij in een project zet. Apply, update, status en verify lezen allemaal dit ene bestand; de vorm
 * staat hieronder in de schemataal, zodat een tikfout in het manifest een leesbare fout geeft in
 * plaats van een half toegepast project.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { formatProblems, validate, type Infer, type ObjectSchema, type Problem, type StringSchema } from "./dsl";
import { SEMVER } from "./semver";

export const MANIFEST_FILE = "template/manifest.json";

export const GENERATOR_NAMES = ["theme", "tokens", "project", "roles", "schema-index", "registry", "labels"] as const;
export type GeneratorName = (typeof GENERATOR_NAMES)[number];

export const FILE_CLASSES = ["owned", "generated", "seed"] as const;
export type FileClass = (typeof FILE_CLASSES)[number];

const PATH = {
  kind: "string",
  pattern: /^(?!\/)(?!(?:.*\/)?\.\.(?:\/|$))[A-Za-z0-9_.()[\]@/-]+$/,
  patternHint: "een relatief pad met gewone slashes, zonder een segment .. erin",
  description: "Een pad, relatief aan de wortel.",
} as const satisfies StringSchema;

const FILE_ENTRY_SCHEMA = {
  kind: "object",
  description: "Een bestand of map dat het template in een project zet.",
  fields: {
    to: { ...PATH, description: "Het pad in het project, relatief aan de wortel. Een map eindigt op / en heeft tree: true." },
    class: {
      kind: "string",
      enum: FILE_CLASSES,
      description:
        "owned: het template overschrijft bij een update. generated: owned, maar berekend uit project.config.json. seed: één keer aangemaakt, daarna van het project.",
    },
    from: {
      kind: "nullable",
      of: { ...PATH, description: "Een pad in het template." },
      default: null,
      description: "De bron in het template als die afwijkt van de standaardplek; zie sourceOf in template/lib/manifest.ts.",
    },
    generator: {
      kind: "nullable",
      of: { kind: "string", enum: GENERATOR_NAMES, description: "De naam van een generator." },
      default: null,
      description: "Voor class generated: welke generator het bestand schrijft.",
    },
    placeholders: {
      kind: "boolean",
      default: false,
      description: "Voor class seed: de bron bevat {{placeholders}} en staat onder template/modules/<module>/seed/.",
    },
    tree: {
      kind: "boolean",
      default: false,
      description: "Een hele map in plaats van één bestand; alle bestanden eronder krijgen dezelfde klasse.",
    },
  },
} as const satisfies ObjectSchema;

const ENV_SCHEMA = {
  kind: "object",
  description: "Een omgevingsvariabele die de module nodig heeft.",
  fields: {
    name: {
      kind: "string",
      pattern: /^[A-Z][A-Z0-9_]*$/,
      patternHint: "hoofdletters, cijfers en liggende streepjes",
      description: "De naam, zoals DATABASE_URL.",
    },
    secret: { kind: "boolean", description: "Een geheim staat alleen in Vercel en .env.local en komt nooit in de chat of in git." },
    where: {
      kind: "string",
      enum: ["both", "vercel", "local"],
      description: "Waar de variabele moet staan: in Vercel en lokaal, alleen in Vercel, of alleen lokaal.",
    },
    guide: { kind: "string", minLength: 1, description: "De handleiding die uitlegt hoe je aan de waarde komt, zoals docs/handleiding/04-neon.md." },
    description: { kind: "string", minLength: 1, description: "Wat de variabele is, in één zin." },
  },
} as const satisfies ObjectSchema;

const CRON_SCHEMA = {
  kind: "object",
  description: "Een cron in vercel.json.",
  fields: {
    path: { kind: "string", format: "path", description: "Het pad van de cronroute, zoals /api/cron/jobs." },
    schedule: { kind: "string", minLength: 9, description: "Het rooster in vijf velden, in UTC." },
  },
} as const satisfies ObjectSchema;

const PINS = {
  kind: "map",
  of: { kind: "string", minLength: 1, description: "De vastgepinde versie." },
  keyPattern: /^(?:@[a-z0-9-~][a-z0-9-._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/,
  default: {},
  description: "Pakketten met hun versie.",
} as const;

const MERGE_SCHEMA = {
  kind: "object",
  description: "Wat de module bijdraagt aan de gedeelde bestanden; de patchers voegen het in.",
  fields: {
    packageJson: {
      kind: "object",
      description: "Scripts en pins in package.json.",
      fields: {
        packageManager: {
          kind: "nullable",
          of: { kind: "string", minLength: 1, description: "Zoals pnpm@11.20.0." },
          default: null,
          description: "De waarde van packageManager; alleen core zet hem.",
        },
        engines: {
          kind: "map",
          of: { kind: "string", minLength: 1, description: "Een versiebereik." },
          default: {},
          description: "De waarden onder engines, zoals node: 24.x.",
        },
        scripts: {
          kind: "map",
          of: { kind: "string", minLength: 1, description: "De opdracht." },
          default: {},
          description: "Scripts die het template beheert.",
        },
        dependencies: { ...PINS, description: "Pins onder dependencies." },
        devDependencies: { ...PINS, description: "Pins onder devDependencies." },
      },
    },
    vercelJson: {
      kind: "object",
      description: "Crons in vercel.json.",
      fields: {
        crons: { kind: "array", of: CRON_SCHEMA, default: [], description: "De crons van de module." },
      },
    },
    envExample: {
      kind: "nullable",
      of: { ...PATH, description: "Een tekstbestand in het template." },
      default: null,
      description: "Het blok voor .env.example, als bestand onder template/modules/<module>/.",
    },
    claudeMd: {
      kind: "nullable",
      of: { ...PATH, description: "Een markdownbestand in het template." },
      default: null,
      description: "Het blok voor CLAUDE.md, als bestand onder template/modules/<module>/.",
    },
    gitignore: {
      kind: "nullable",
      of: { ...PATH, description: "Een tekstbestand in het template." },
      default: null,
      description: "Het blok voor .gitignore, als bestand onder template/modules/<module>/.",
    },
  },
} as const satisfies ObjectSchema;

const MIGRATION_SCHEMA = {
  kind: "object",
  description: "De terugweg en de handgeschreven stappen van één schemaversie.",
  fields: {
    down: { ...PATH, description: "Het SQL-bestand met de terugweg." },
    custom: {
      kind: "nullable",
      of: { ...PATH, description: "Een SQL-bestand in het template." },
      default: null,
      description: "Handgeschreven SQL die drizzle-kit niet kan afleiden, zoals triggers en constraints.",
    },
    customDown: {
      kind: "nullable",
      of: { ...PATH, description: "Een SQL-bestand in het template." },
      default: null,
      description: "De terugweg van custom.",
    },
  },
} as const satisfies ObjectSchema;

const REGISTRATION_SCHEMA = {
  kind: "object",
  description: "Een export van de module die de kern via het gegenereerde register aanroept.",
  fields: {
    name: {
      kind: "string",
      pattern: /^[A-Za-z_$][A-Za-z0-9_$]*$/,
      patternHint: "een geldige TypeScript-naam",
      description: "De naam van de export, zoals entraLoginProvider.",
    },
    from: {
      kind: "string",
      pattern: /^@\/[A-Za-z0-9_./()-]+$/,
      patternHint: "een importpad dat met @/ begint",
      description: "Het importpad, zoals @/lib/auth/providers/entra-login.",
    },
    as: {
      kind: "nullable",
      of: {
        kind: "string",
        pattern: /^[A-Za-z_$][A-Za-z0-9_$]*$/,
        patternHint: "een geldige TypeScript-naam",
        description: "Een naam.",
      },
      default: null,
      description: "Alleen voor labels: de sleutel in `labels` als die anders moet zijn dan de modulenaam (bijvoorbeeld password voor auth-password).",
    },
  },
} as const satisfies ObjectSchema;

const REGISTRATIONS = { kind: "array", of: REGISTRATION_SCHEMA, default: [], description: "Exports van de module." } as const;

const MODULE_SCHEMA = {
  kind: "object",
  description: "Een module van het template.",
  fields: {
    title: { kind: "string", minLength: 2, maxLength: 60, description: "De naam voor mensen, Nederlands." },
    description: { kind: "string", minLength: 10, description: "Wat de module doet, in één of twee zinnen." },
    status: {
      kind: "nullable",
      of: {
        kind: "string",
        enum: ["planned", "reserved"],
        description: "planned: komt in een latere ronde van deze versie. reserved: pas in een latere versie van het template.",
      },
      default: null,
      description: "Leeg als de module beschikbaar is.",
    },
    always: { kind: "boolean", default: false, description: "Altijd toegepast, zonder in modules te staan. Alleen core." },
    inRoot: {
      kind: "boolean",
      default: false,
      description: "De bestanden staan in de wortel van het template zelf (core en de standaardinlogmodule); anders onder template/modules/<module>/files/.",
    },
    requires: {
      kind: "array",
      of: { kind: "string", minLength: 1, description: "Een modulenaam." },
      unique: true,
      default: [],
      description: "Modules die eerst nodig zijn.",
    },
    conflicts: {
      kind: "array",
      of: { kind: "string", minLength: 1, description: "Een modulenaam." },
      unique: true,
      default: [],
      description: "Modules die niet samengaan met deze.",
    },
    schemaVersion: { kind: "integer", minimum: 0, default: 0, description: "De versie van het databaseschema van de module; 0 is geen schema." },
    files: { kind: "array", of: FILE_ENTRY_SCHEMA, default: [], description: "De bestanden van de module." },
    schemaFiles: {
      kind: "array",
      of: {
        kind: "string",
        pattern: /^[a-z0-9-]+$/,
        patternHint: "een bestandsnaam zonder extensie in lib/db/schema/",
        description: "Een schemabestand.",
      },
      unique: true,
      default: [],
      description: "De schemabestanden van de module in lib/db/schema/, zonder extensie, in de volgorde van exporteren.",
    },
    registry: {
      kind: "object",
      description: "Wat de module bij de kern aanmeldt; de generator schrijft er de registers uit.",
      fields: {
        loginProviders: { ...REGISTRATIONS, description: "Inlogmethoden (LoginProvider)." },
        loginButtons: { ...REGISTRATIONS, description: "Componenten op het inlogscherm, één per inlogmethode." },
        loginExtras: { ...REGISTRATIONS, description: "Wat er verder op het inlogscherm staat." },
        healthProviders: { ...REGISTRATIONS, description: "Koppelingen voor Beheer, Systeem (HealthProvider)." },
        adminTabs: { ...REGISTRATIONS, description: "Tabbladen onder Beheer (AdminTab): een functie van de actor naar een tabblad of null." },
        navItems: { ...REGISTRATIONS, description: "Bestemmingen in de rail (ModuleNavItem): een functie van de actor naar een item of null, na die van het project." },
        labels: { ...REGISTRATIONS, description: "De teksten van de module in beide talen, als Record<nl | en, …>; komen onder de modulenaam in labels." },
      },
    },
    merge: MERGE_SCHEMA,
    env: { kind: "array", of: ENV_SCHEMA, default: [], description: "De omgevingsvariabelen van de module." },
    migrations: {
      kind: "map",
      of: MIGRATION_SCHEMA,
      keyPattern: /^[1-9][0-9]*$/,
      default: {},
      description: "Per schemaversie de terugweg en de handgeschreven stappen.",
    },
    manual: {
      kind: "array",
      of: { kind: "string", minLength: 1, description: "Eén handeling." },
      default: [],
      description: "Wat een mens na het toepassen met de hand doet, in gewone taal.",
    },
  },
} as const satisfies ObjectSchema;

export const MANIFEST_SCHEMA = {
  kind: "object",
  description: "Het manifest van het template: versie, bron en modules.",
  fields: {
    manifestVersion: { kind: "integer", const: 1, description: "De versie van dit bestandsformaat." },
    version: {
      kind: "string",
      pattern: SEMVER,
      patternHint: "een versie als 1.2.3",
      description: "De versie van het template. template:release verhoogt hem en zet de tag.",
    },
    source: {
      kind: "nullable",
      of: { kind: "string", format: "git-url", description: "Een git-adres." },
      default: null,
      description: "Het git-adres van het template, voor template:update. project.config.json kan het overschrijven.",
    },
    rootRenderedOn: {
      kind: "string",
      format: "date",
      description: "De datum waarmee de seeds in de wortel van het template zijn gerenderd; de zelftest rendert ze opnieuw met deze datum.",
    },
    modules: {
      kind: "map",
      of: MODULE_SCHEMA,
      keyPattern: /^[a-z][a-z0-9-]*$/,
      description: "De modules, op naam.",
    },
  },
} as const satisfies ObjectSchema;

export type Manifest = Infer<typeof MANIFEST_SCHEMA>;
export type ModuleManifest = Manifest["modules"][string];
export type FileEntry = Infer<typeof FILE_ENTRY_SCHEMA>;
export type EnvVar = Infer<typeof ENV_SCHEMA>;
export type CronEntry = Infer<typeof CRON_SCHEMA>;

export class ManifestError extends Error {
  constructor(readonly problems: readonly Problem[]) {
    super(`${MANIFEST_FILE} is niet geldig:\n${formatProblems(problems)}`);
    this.name = "ManifestError";
  }
}

export function loadManifest(root: string): Manifest {
  return parseManifest(readFileSync(join(root, MANIFEST_FILE), "utf8"));
}

export function parseManifest(text: string): Manifest {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new ManifestError([{ path: "", message: `geen geldige JSON: ${error instanceof Error ? error.message : String(error)}` }]);
  }
  const validated = validate(MANIFEST_SCHEMA, raw, { ignoreKeys: ["$schema"] });
  if (!validated.ok) throw new ManifestError(validated.errors);
  const problems = crossCheck(validated.value);
  if (problems.length > 0) throw new ManifestError(problems);
  return validated.value;
}

/** De controles die over meer dan één veld gaan. */
function crossCheck(manifest: Manifest): Problem[] {
  const problems: Problem[] = [];
  const names = Object.keys(manifest.modules);
  const always = names.filter((name) => manifest.modules[name]?.always);
  if (always.length !== 1 || always[0] !== "core") {
    problems.push({ path: "modules", message: "precies één module heeft always: true, en dat is core" });
  }

  const targets = new Map<string, string>();
  for (const [name, module] of Object.entries(manifest.modules)) {
    for (const other of [...module.requires, ...module.conflicts]) {
      if (!names.includes(other)) problems.push({ path: `modules.${name}`, message: `verwijst naar onbekende module "${other}"` });
    }
    if (module.requires.includes(name)) problems.push({ path: `modules.${name}.requires`, message: "een module kan zichzelf niet vereisen" });
    if (module.status !== null && module.files.length > 0) {
      problems.push({ path: `modules.${name}.files`, message: `een module met status ${module.status} heeft nog geen bestanden` });
    }
    module.files.forEach((entry, index) => {
      const path = `modules.${name}.files[${index}]`;
      if (entry.class === "generated" && entry.generator === null) problems.push({ path, message: "class generated vraagt een generator" });
      if (entry.class !== "generated" && entry.generator !== null) problems.push({ path, message: "alleen class generated heeft een generator" });
      if (entry.placeholders && entry.class !== "seed") problems.push({ path, message: "placeholders horen alleen bij class seed" });
      if (entry.tree !== entry.to.endsWith("/")) problems.push({ path, message: "een map eindigt op / en heeft tree: true; een bestand geen van beide" });
      if (entry.tree && entry.class !== "owned") problems.push({ path, message: "een map is altijd class owned" });
      const owner = targets.get(entry.to);
      if (owner !== undefined) problems.push({ path, message: `${entry.to} staat ook bij module ${owner}` });
      targets.set(entry.to, name);
    });
    for (const [version, migration] of Object.entries(module.migrations)) {
      if (Number(version) > module.schemaVersion) {
        problems.push({ path: `modules.${name}.migrations.${version}`, message: `hoger dan schemaVersion ${module.schemaVersion}` });
      }
      if ((migration.custom === null) !== (migration.customDown === null)) {
        problems.push({ path: `modules.${name}.migrations.${version}`, message: "custom en customDown horen bij elkaar" });
      }
    }
  }
  return problems;
}

/**
 * Waar de bron van een bestand in het template staat.
 *
 * Een module in de wortel (`inRoot`) levert zijn bestanden vanuit de wortel zelf, want de wortel van
 * het template is een werkend project. Een opt-in module levert ze vanuit `template/modules/<naam>/`.
 * Een seed met placeholders staat altijd onder `seed/`, want de wortel bevat de gerenderde versie.
 */
export function sourceOf(moduleName: string, module: ModuleManifest, entry: FileEntry): string {
  if (entry.from !== null) return entry.from;
  if (entry.class === "seed" && entry.placeholders) return `template/modules/${moduleName}/seed/${entry.to}`;
  if (module.inRoot) return entry.to;
  return entry.class === "seed" ? `template/modules/${moduleName}/seed/${entry.to}` : `template/modules/${moduleName}/files/${entry.to}`;
}

/**
 * De modules die bij een configuratie horen, in volgorde van toepassen: core eerst, daarna elke
 * module na de modules die hij vereist. Een onbekende naam gooit, want de config is dan al door de
 * validatie heen en dit kan alleen een programmeerfout zijn.
 */
export function appliedModules(manifest: Manifest, chosen: readonly string[]): string[] {
  const order: string[] = [];
  const visiting = new Set<string>();
  const visit = (name: string): void => {
    if (order.includes(name)) return;
    const found = manifest.modules[name];
    if (found === undefined) throw new Error(`onbekende module "${name}"`);
    if (visiting.has(name)) throw new Error(`modules vereisen elkaar in een kring: ${[...visiting, name].join(" > ")}`);
    visiting.add(name);
    for (const required of found.requires) visit(required);
    visiting.delete(name);
    order.push(name);
  };
  for (const name of Object.keys(manifest.modules)) if (manifest.modules[name]?.always) visit(name);
  for (const name of chosen) visit(name);
  return order;
}
