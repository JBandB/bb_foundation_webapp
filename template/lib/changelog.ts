/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `template/CHANGELOG.md` lezen en bijwerken: de secties per versie, wat er tussen twee versies
 * veranderde (voor de slottekst van template:update), en het afsluiten van "Nog niet uitgebracht"
 * bij een release.
 */
import { compareVersions, parseVersion } from "./semver";

export const UNRELEASED_HEADING = "## Nog niet uitgebracht";

export interface ChangelogSection {
  /** De versie uit de kop, of null voor "Nog niet uitgebracht". */
  readonly version: string | null;
  readonly heading: string;
  readonly body: string;
}

export function parseChangelog(text: string): ChangelogSection[] {
  const sections: ChangelogSection[] = [];
  const lines = text.split("\n");
  let current: { heading: string; body: string[] } | undefined;
  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (current !== undefined) sections.push(finish(current));
      current = { heading: line.slice(3).trim(), body: [] };
    } else if (current !== undefined) {
      current.body.push(line);
    }
  }
  if (current !== undefined) sections.push(finish(current));
  return sections;
}

function finish(section: { heading: string; body: string[] }): ChangelogSection {
  const match = /^v(\d+\.\d+\.\d+)/.exec(section.heading);
  return { version: match?.[1] ?? null, heading: section.heading, body: section.body.join("\n").trim() };
}

/** De secties met een versie na `fromExclusive` tot en met `toInclusive`, nieuwste eerst zoals in het bestand. */
export function sectionsBetween(text: string, fromExclusive: string, toInclusive: string): ChangelogSection[] {
  const from = parseVersion(fromExclusive);
  const to = parseVersion(toInclusive);
  if (from === undefined || to === undefined) return [];
  return parseChangelog(text).filter((section) => {
    if (section.version === null) return false;
    const version = parseVersion(section.version);
    return version !== undefined && compareVersions(version, from) > 0 && compareVersions(version, to) <= 0;
  });
}

const EMPTY_UNRELEASED = [UNRELEASED_HEADING, "", "### Wat verandert", "", "- Nog niets.", "", "### Let op bij bijwerken", "", "- Nog niets.", ""].join("\n");

/** Maakt van "Nog niet uitgebracht" de sectie van deze versie en zet een lege "Nog niet uitgebracht" erboven. */
export function releaseChangelog(text: string, version: string, dateText: string): string {
  const index = text.indexOf(UNRELEASED_HEADING);
  if (index < 0) throw new Error(`${UNRELEASED_HEADING} ontbreekt in template/CHANGELOG.md`);
  const heading = `## v${version} (${dateText})`;
  return `${text.slice(0, index)}${EMPTY_UNRELEASED}\n${heading}${text.slice(index + UNRELEASED_HEADING.length)}`;
}
