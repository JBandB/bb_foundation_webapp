/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `template:release X.Y.Z`, alleen in de repo van het template: de versie in het manifest omhoog,
 * "Nog niet uitgebracht" in de CHANGELOG afsluiten als deze versie, en de lock van de wortel
 * bijwerken. Het committen en het zetten van de tag `vX.Y.Z` doet de mens.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { configsEqual, readDefaultConfig } from "./apply";
import { releaseChangelog } from "./changelog";
import { readConfig } from "./config";
import { loadManifest, MANIFEST_FILE } from "./manifest";
import { longDate, todayIn } from "./placeholders";
import { compareVersions, parseVersion } from "./semver";

export class ReleaseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReleaseError";
  }
}

export interface ReleaseResult {
  readonly from: string;
  readonly to: string;
  readonly dateText: string;
}

export function prepareRelease(root: string, requested: string, now: Date = new Date()): ReleaseResult {
  const manifest = loadManifest(root);
  const config = readConfig(root, manifest).config;
  if (config === undefined || !configsEqual(config, readDefaultConfig(root, manifest))) {
    throw new ReleaseError("template:release hoort alleen in de repo van het template zelf (de wortel staat daar op de standaardconfiguratie). In een project werk je bij met pnpm template:update.");
  }

  const to = parseVersion(requested);
  const from = parseVersion(manifest.version);
  if (to === undefined || from === undefined) throw new ReleaseError(`Geen geldige versie: ${requested}. Gebruik X.Y.Z.`);
  if (compareVersions(to, from) <= 0) throw new ReleaseError(`Versie ${requested} is niet hoger dan de huidige ${manifest.version}.`);
  const toText = requested.replace(/^v/, "");

  const manifestPath = join(root, MANIFEST_FILE);
  const manifestText = readFileSync(manifestPath, "utf8");
  const versionLine = `"version": ${JSON.stringify(manifest.version)}`;
  if (!manifestText.includes(versionLine)) throw new ReleaseError(`De regel ${versionLine} staat niet letterlijk in ${MANIFEST_FILE}.`);
  writeFileSync(manifestPath, manifestText.replace(versionLine, `"version": ${JSON.stringify(toText)}`), "utf8");

  const changelogPath = join(root, "template", "CHANGELOG.md");
  const dateText = longDate(todayIn("Europe/Amsterdam", now), "nl-NL");
  writeFileSync(changelogPath, releaseChangelog(readFileSync(changelogPath, "utf8"), toText, dateText), "utf8");

  return { from: manifest.version, to: toText, dateText };
}
