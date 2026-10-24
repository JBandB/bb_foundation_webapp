/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { aiLabels } from "./ai";

function leaves(value: unknown, path = ""): [string, unknown][] {
  if (typeof value !== "object" || value === null) return [[path, value]];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, path === "" ? key : `${path}.${key}`));
}

describe("de teksten van de module ai", () => {
  it("hebben dezelfde sleutels in beide talen", () => {
    expect(leaves(aiLabels.en).map(([path]) => path)).toEqual(leaves(aiLabels.nl).map(([path]) => path));
  });

  it("hebben geen vergeten vertalingen", () => {
    /* Dezelfde woorden in beide talen, elk met een reden: vaktermen en eigennamen. */
    const allowed = new Set(["tab", "title", "promptsTitle", "colPrompt", "colModel", "settingModel", "priceModel", "healthName", "effortNames.low", "effortNames.medium", "effortNames.high"]);
    const nl = new Map(leaves(aiLabels.nl));
    const same = leaves(aiLabels.en)
      .filter(([path, value]) => typeof value === "string" && !allowed.has(path) && nl.get(path) === value)
      .map(([path]) => path);
    expect(same).toEqual([]);
  });

  it("noemen de variabele bij een ontbrekende sleutel", () => {
    expect(aiLabels.nl.noKey("ANTHROPIC_API_KEY")).toContain("ANTHROPIC_API_KEY");
    expect(aiLabels.en.healthNoKey("ANTHROPIC_API_KEY")).toContain("ANTHROPIC_API_KEY");
  });
});
