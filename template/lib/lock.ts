/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `template.lock.json`: wat het template in dit project heeft neergezet, en in welke staat. Apply en
 * update vergelijken elk beheerd bestand met de hash hierin om te zien of het project het heeft
 * aangeraakt; status en verify lezen hem om te zeggen hoe het ervoor staat.
 *
 * Hashes gaan over de inhoud na normalisatie van regeleinden (CRLF wordt LF, een BOM verdwijnt),
 * zodat een checkout op Windows niet als "gewijzigd" telt. Het bestand wordt met gesorteerde sleutels
 * geschreven, één regel per bestand, zodat een diff in een pull request leesbaar blijft.
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { FILE_CLASSES } from "./manifest";
import { formatProblems, validate, type Infer, type ObjectSchema, type Problem } from "./dsl";
import { SEMVER } from "./semver";

export const LOCK_FILE = "template.lock.json";

const HASH = {
  kind: "string",
  pattern: /^[a-f0-9]{64}$/,
  patternHint: "een sha256 in hex",
  description: "De sha256 van de inhoud, na normalisatie van regeleinden.",
} as const;

const LOCKED_FILE_SCHEMA = {
  kind: "object",
  description: "Eén bestand onder beheer van het template.",
  fields: {
    module: { kind: "string", minLength: 1, description: "De module waar het bestand bij hoort." },
    class: { kind: "string", enum: FILE_CLASSES, description: "owned, generated of seed." },
    hash: HASH,
    seeded: {
      kind: "boolean",
      default: false,
      description: "Voor seeds: true zodra het bestand met de echte configuratie is gerenderd en van het project is.",
    },
    seededIn: {
      kind: "nullable",
      of: { kind: "string", pattern: SEMVER, description: "Een versie van het template." },
      default: null,
      description: "De versie van het template waarmee de seed is gerenderd.",
    },
    sourceHash: {
      kind: "nullable",
      of: HASH,
      default: null,
      description: "De hash van de bron van de seed (met placeholders) op het moment van renderen, om een nieuwere opzet te kunnen melden.",
    },
    shippedHash: {
      kind: "nullable",
      of: HASH,
      default: null,
      description: "Voor seeds die met de wortel van het template meekwamen en nog niet zijn gerenderd: de hash van die neutrale versie.",
    },
  },
} as const satisfies ObjectSchema;

const PINS = {
  kind: "map",
  of: { kind: "string", minLength: 1, description: "De versie die het template zette." },
  default: {},
  description: "Pakketten met de versie die het template beheert.",
} as const;

const NAMES = {
  kind: "array",
  of: { kind: "string", minLength: 1, description: "Een naam." },
  unique: true,
  default: [],
  description: "Namen die het template beheert.",
} as const;

export const LOCK_SCHEMA = {
  kind: "object",
  description: "De stand van het template in dit project.",
  fields: {
    lockVersion: { kind: "integer", const: 1, description: "De versie van dit bestandsformaat." },
    source: {
      kind: "nullable",
      of: { kind: "string", format: "git-url", description: "Een git-adres." },
      default: null,
      description: "Het git-adres van het template waar dit project uit komt.",
    },
    version: { kind: "string", pattern: SEMVER, patternHint: "een versie als 1.2.3", description: "De versie van het template die is toegepast." },
    appliedAt: {
      kind: "string",
      pattern: /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/,
      patternHint: "een tijdstip in UTC, zoals 2026-10-02T09:30:00Z",
      description: "Wanneer het template voor het laatst is toegepast of bijgewerkt.",
    },
    modules: {
      kind: "map",
      of: {
        kind: "object",
        description: "De stand van één module.",
        fields: {
          schemaVersion: { kind: "integer", minimum: 0, description: "De schemaversie van de module die in dit project staat." },
          migrations: {
            kind: "array",
            of: { kind: "string", minLength: 1, description: "Een tag uit het drizzle-journal." },
            unique: true,
            default: [],
            description: "De migraties die apply voor deze module heeft gegenereerd.",
          },
        },
      },
      default: {},
      description: "De toegepaste modules, op naam.",
    },
    files: { kind: "map", of: LOCKED_FILE_SCHEMA, default: {}, description: "De beheerde bestanden, op pad." },
    merged: {
      kind: "object",
      description: "Wat het template beheert in de gedeelde bestanden.",
      fields: {
        packageJson: {
          kind: "object",
          description: "package.json.",
          fields: {
            scripts: { ...PINS, description: "Scripts met de opdracht die het template zette." },
            dependencies: PINS,
            devDependencies: PINS,
          },
        },
        vercelCrons: { ...NAMES, description: "De cronpaden in vercel.json die het template beheert." },
        envBlocks: { ...NAMES, description: "De blokken in .env.example." },
        claudeBlocks: { ...NAMES, description: "De blokken in CLAUDE.md." },
        gitignoreBlocks: { ...NAMES, description: "De blokken in .gitignore." },
      },
    },
    adopted: { ...NAMES, description: "Paden die het project met template:adopt heeft overgenomen; het template schrijft ze nooit meer." },
  },
} as const satisfies ObjectSchema;

export type Lock = Infer<typeof LOCK_SCHEMA>;
export type LockedFile = Infer<typeof LOCKED_FILE_SCHEMA>;

export class LockError extends Error {
  constructor(readonly problems: readonly Problem[]) {
    super(`${LOCK_FILE} is niet geldig:\n${formatProblems(problems)}`);
    this.name = "LockError";
  }
}

export function emptyLock(version: string, source: string | null, appliedAt: string): Lock {
  return {
    lockVersion: 1,
    source,
    version,
    appliedAt,
    modules: {},
    files: {},
    merged: { packageJson: { scripts: {}, dependencies: {}, devDependencies: {} }, vercelCrons: [], envBlocks: [], claudeBlocks: [], gitignoreBlocks: [] },
    adopted: [],
  };
}

/** Leest de lock; undefined als het bestand er niet is, een LockError als het er is maar niet klopt. */
export function readLock(root: string): Lock | undefined {
  const path = join(root, LOCK_FILE);
  if (!existsSync(path)) return undefined;
  return parseLock(readFileSync(path, "utf8"));
}

export function parseLock(text: string): Lock {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    throw new LockError([{ path: "", message: `geen geldige JSON: ${error instanceof Error ? error.message : String(error)}` }]);
  }
  const validated = validate(LOCK_SCHEMA, raw);
  if (!validated.ok) throw new LockError(validated.errors);
  return validated.value;
}

export function writeLock(root: string, lock: Lock): void {
  writeFileSync(join(root, LOCK_FILE), serialiseLock(lock), "utf8");
}

/** Vaste volgorde bovenin, gesorteerde sleutels in elke map, één regel per bestand. */
export function serialiseLock(lock: Lock): string {
  const head = {
    lockVersion: lock.lockVersion,
    source: lock.source,
    version: lock.version,
    appliedAt: lock.appliedAt,
    modules: sortedMap(lock.modules),
  };
  const tail = {
    merged: {
      packageJson: {
        scripts: sortedMap(lock.merged.packageJson.scripts),
        dependencies: sortedMap(lock.merged.packageJson.dependencies),
        devDependencies: sortedMap(lock.merged.packageJson.devDependencies),
      },
      vercelCrons: [...lock.merged.vercelCrons].sort(compareText),
      envBlocks: [...lock.merged.envBlocks].sort(compareText),
      claudeBlocks: [...lock.merged.claudeBlocks].sort(compareText),
      gitignoreBlocks: [...lock.merged.gitignoreBlocks].sort(compareText),
    },
    adopted: [...lock.adopted].sort(compareText),
  };
  /* Het kopstuk zonder zijn sluitaccolade, het staartstuk zonder zijn openingsaccolade, en de bestanden ertussen. */
  const headText = JSON.stringify(head, null, 2).slice(0, -2);
  const tailText = JSON.stringify(tail, null, 2).slice(1);
  const fileLines = Object.entries(sortedMap(lock.files)).map(([path, file]) => `    ${JSON.stringify(path)}: ${JSON.stringify(file)}`);
  const filesText = fileLines.length === 0 ? '  "files": {}' : `  "files": {\n${fileLines.join(",\n")}\n  }`;
  return `${headText},\n${filesText},${tailText}\n`;
}

function sortedMap<T>(map: Readonly<Record<string, T>>): Record<string, T> {
  return Object.fromEntries(Object.entries(map).sort(([a], [b]) => compareText(a, b)));
}

/** Vergelijkt op code units, niet op locale, zodat elke machine dezelfde volgorde geeft. */
export function compareText(a: string, b: string): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** CRLF wordt LF en een BOM verdwijnt, zodat een checkout op Windows dezelfde hash geeft. */
export function normaliseNewlines(text: string): string {
  return text.replace(/^﻿/, "").replace(/\r\n?/g, "\n");
}

export function hashText(text: string): string {
  return createHash("sha256").update(normaliseNewlines(text), "utf8").digest("hex");
}

export function hashBytes(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}
