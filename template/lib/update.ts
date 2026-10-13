/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `template:update`: een nieuwere versie van het template ophalen en toepassen. De bron is een
 * git-tag van `lock.source` (of een map met `--from`, voor de CI en voor wie offline werkt), en het
 * toepassen gebeurt door de tooling **uit die nieuwe versie**: wij starten `template/cli/main.ts` van
 * de kloon met dit project als werkmap. Zo kan een nieuwe versie zijn eigen lockformaat lezen en
 * bijwerken, en hoeft de oude tooling de nieuwe niet te kennen.
 */
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { sectionsBetween } from "./changelog";
import { readConfig } from "./config";
import { cloneTag, lsRemoteTags } from "./git";
import { LOCK_FILE, readLock } from "./lock";
import { loadManifest, MANIFEST_FILE } from "./manifest";
import { compareVersions, latestTag, parseVersion } from "./semver";

export interface UpdatePlan {
  readonly fromVersion: string;
  readonly toVersion: string;
  /** De map met de nieuwe versie, en hoe die weer weg moet. */
  readonly sourceDir: string;
  readonly cleanup: () => void;
  readonly tag: string | null;
}

export class UpdateError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UpdateError";
  }
}

export function planUpdate(root: string, options: { readonly to?: string | undefined; readonly from?: string | undefined }): UpdatePlan {
  const lock = readLock(root);
  if (lock === undefined) throw new UpdateError(`${LOCK_FILE} ontbreekt; draai eerst pnpm template:apply.`);
  const fromVersion = lock.version;

  if (options.from !== undefined) {
    const sourceDir = resolve(root, options.from);
    if (!existsSync(join(sourceDir, MANIFEST_FILE))) throw new UpdateError(`${sourceDir} is geen kopie van het template: ${MANIFEST_FILE} ontbreekt.`);
    return { fromVersion, toVersion: loadManifest(sourceDir).version, sourceDir, cleanup: () => undefined, tag: null };
  }

  const manifest = loadManifest(root);
  const config = readConfig(root, manifest).config;
  const url = lock.source ?? config?.template.source ?? null;
  if (url === null) {
    throw new UpdateError("Het git-adres van het template is niet bekend. Zet template.source in project.config.json (bijvoorbeeld git@github.com:organisatie/template.git) en draai pnpm template:apply, of geef een map mee met --from.");
  }

  const tags = lsRemoteTags(url, root);
  const tag = options.to === undefined ? latestTag(tags) : tags.find((candidate) => candidate === `v${options.to}` || candidate === options.to);
  if (tag === undefined) {
    throw new UpdateError(options.to === undefined ? `${url} heeft nog geen versietags (vX.Y.Z).` : `Versie ${options.to} bestaat niet bij ${url}. Beschikbaar: ${tags.join(", ") || "geen"}.`);
  }
  const toVersion = parseVersion(tag);
  const current = parseVersion(fromVersion);
  if (toVersion === undefined || current === undefined) throw new UpdateError(`Geen geldige versie: ${tag} of ${fromVersion}.`);
  if (options.to === undefined && compareVersions(toVersion, current) <= 0) {
    return { fromVersion, toVersion: fromVersion, sourceDir: "", cleanup: () => undefined, tag };
  }

  const tmp = mkdtempSync(join(tmpdir(), "template-update-"));
  const sourceDir = join(tmp, "src");
  cloneTag(url, tag, sourceDir, root);
  return { fromVersion, toVersion: tag.replace(/^v/, ""), sourceDir, cleanup: () => rmSync(tmp, { recursive: true, force: true }), tag };
}

/** Start apply uit de nieuwe versie, met dit project als werkmap. */
export function runHandoff(root: string, sourceDir: string, extraArgs: readonly string[]): number {
  const tsx = process.env.TEMPLATE_TSX ?? join(root, "node_modules", "tsx", "dist", "cli.mjs");
  if (!existsSync(tsx)) throw new UpdateError("tsx ontbreekt in node_modules; draai eerst pnpm install.");
  const result = spawnSync(process.execPath, ["--env-file-if-exists=.env.local", tsx, join(sourceDir, "template", "cli", "main.ts"), "apply", "--source", sourceDir, ...extraArgs], {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });
  if (result.error !== undefined) throw new UpdateError(`De tooling van de nieuwe versie kon niet starten: ${result.error.message}`);
  return result.status ?? 1;
}

/** De secties uit de CHANGELOG van de nieuwe versie die tussen oud en nieuw liggen. */
export function changesBetween(sourceDir: string, fromVersion: string, toVersion: string): string {
  const path = join(sourceDir, "template", "CHANGELOG.md");
  if (!existsSync(path)) return "";
  const sections = sectionsBetween(readFileSync(path, "utf8"), fromVersion, toVersion);
  return sections.map((section) => `## ${section.heading}\n\n${section.body}`).join("\n\n");
}
