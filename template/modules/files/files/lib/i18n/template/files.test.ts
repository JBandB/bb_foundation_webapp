/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { filesLabels } from "./files";

function leaves(value: unknown, path = ""): [string, unknown][] {
  if (typeof value !== "object" || value === null) return [[path, value]];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, path === "" ? key : `${path}.${key}`));
}

describe("de teksten van de module files", () => {
  it("hebben dezelfde sleutels in beide talen", () => {
    expect(leaves(filesLabels.en).map(([path]) => path)).toEqual(leaves(filesLabels.nl).map(([path]) => path));
  });

  it("hebben geen vergeten vertalingen", () => {
    const nl = new Map(leaves(filesLabels.nl));
    const same = leaves(filesLabels.en)
      .filter(([path, value]) => typeof value === "string" && nl.get(path) === value)
      .map(([path]) => path);
    expect(same).toEqual([]);
  });
});
