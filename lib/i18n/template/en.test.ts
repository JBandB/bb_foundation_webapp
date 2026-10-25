/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { en } from "./en";
import { nl } from "./nl";

/** Alle bladeren van een genest object als paren van pad en waarde; functies tellen als blad. */
function leaves(value: unknown, path = ""): [string, unknown][] {
  if (typeof value !== "object" || value === null) return [[path, value]];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, path === "" ? key : `${path}.${key}`));
}

describe("de templateteksten in twee talen", () => {
  it("hebben dezelfde sleutels", () => {
    expect(leaves(en).map(([path]) => path)).toEqual(leaves(nl).map(([path]) => path));
  });

  /**
   * Geen enkele Engelse tekst is per ongeluk de Nederlandse gebleven. Er is een korte lijst die het
   * wel mag zijn, elk met een reden; elke andere gelijke tekst is een vergeten vertaling.
   */
  it("hebben geen vergeten vertalingen", () => {
    const allowed = new Set([
      /* De projectnaam en de organisatie komen uit de config en zijn in beide talen hetzelfde. */
      "app.name",
      "app.shortName",
      "app.description",
      "app.organisation",
      /* Dezelfde woorden in beide talen. */
      "ui.edit",
      "about.tabRoadmap",
      "about.roadmapTitle",
      "toolFeedback.open",
      "admin.tabFeedback",
      "feedback.title",
      "error.code",
      "system.environmentNames.preview",
    ]);
    const nlMap = new Map(leaves(nl));
    const same = leaves(en)
      .filter(([path, value]) => typeof value === "string" && !allowed.has(path) && nlMap.get(path) === value)
      .map(([path]) => path);
    expect(same).toEqual([]);
  });
});
