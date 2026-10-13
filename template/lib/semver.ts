/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Versienummers van het template: drie getallen, met of zonder v ervoor. Geen pre-release en geen
 * build-metadata, want het template kent alleen uitgebrachte versies met een tag.
 */

export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export interface Version {
  readonly major: number;
  readonly minor: number;
  readonly patch: number;
}

/** Leest `1.2.3` of `v1.2.3`; alles anders geeft undefined. */
export function parseVersion(text: string): Version | undefined {
  const match = SEMVER.exec(text.startsWith("v") ? text.slice(1) : text);
  if (match === null) return undefined;
  return { major: Number(match[1]), minor: Number(match[2]), patch: Number(match[3]) };
}

export function formatVersion(version: Version, withPrefix = false): string {
  return `${withPrefix ? "v" : ""}${version.major}.${version.minor}.${version.patch}`;
}

export function compareVersions(a: Version, b: Version): -1 | 0 | 1 {
  for (const part of ["major", "minor", "patch"] as const) {
    if (a[part] < b[part]) return -1;
    if (a[part] > b[part]) return 1;
  }
  return 0;
}

export function bumpVersion(version: Version, part: "major" | "minor" | "patch"): Version {
  switch (part) {
    case "major":
      return { major: version.major + 1, minor: 0, patch: 0 };
    case "minor":
      return { major: version.major, minor: version.minor + 1, patch: 0 };
    case "patch":
      return { major: version.major, minor: version.minor, patch: version.patch + 1 };
  }
}

/** De hoogste tag van de vorm vX.Y.Z uit een lijst; andere tags tellen niet mee. */
export function latestTag(tags: readonly string[]): string | undefined {
  let best: { tag: string; version: Version } | undefined;
  for (const tag of tags) {
    if (!tag.startsWith("v")) continue;
    const version = parseVersion(tag);
    if (version === undefined) continue;
    if (best === undefined || compareVersions(version, best.version) > 0) best = { tag, version };
  }
  return best?.tag;
}
