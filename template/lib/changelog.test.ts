/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { parseChangelog, releaseChangelog, sectionsBetween } from "./changelog";

const text = ["# Changelog", "", "Inleiding.", "", "## Nog niet uitgebracht", "", "- Werk.", "", "## v0.3.0 (3 oktober 2026)", "", "- Drie.", "", "## v0.2.0 (2 oktober 2026)", "", "- Twee.", "", "## v0.1.0 (1 oktober 2026)", "", "- Eén.", ""].join("\n");

describe("changelog", () => {
  it("leest de secties met hun versie", () => {
    expect(parseChangelog(text).map((section) => [section.version, section.body])).toEqual([
      [null, "- Werk."],
      ["0.3.0", "- Drie."],
      ["0.2.0", "- Twee."],
      ["0.1.0", "- Eén."],
    ]);
  });

  it("geeft wat er tussen twee versies veranderde, zonder de oude en met de nieuwe", () => {
    expect(sectionsBetween(text, "0.1.0", "0.3.0").map((section) => section.version)).toEqual(["0.3.0", "0.2.0"]);
    expect(sectionsBetween(text, "0.3.0", "0.3.0")).toEqual([]);
  });

  it("sluit 'Nog niet uitgebracht' af als een versie en zet een lege erboven", () => {
    const released = releaseChangelog(text, "0.4.0", "4 oktober 2026");
    const sections = parseChangelog(released);
    expect(sections[0]?.version).toBeNull();
    expect(sections[0]?.body).toContain("- Nog niets.");
    expect(sections[1]?.heading).toBe("v0.4.0 (4 oktober 2026)");
    expect(sections[1]?.body).toBe("- Werk.");
    expect(sections[2]?.version).toBe("0.3.0");
  });
});
