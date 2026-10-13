/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { jobsLabels } from "./jobs";

function leaves(value: unknown, path = ""): [string, unknown][] {
  if (typeof value !== "object" || value === null) return [[path, value]];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, path === "" ? key : `${path}.${key}`));
}

describe("de teksten van de module jobs", () => {
  it("hebben dezelfde sleutels in beide talen", () => {
    expect(leaves(jobsLabels.en).map(([path]) => path)).toEqual(leaves(jobsLabels.nl).map(([path]) => path));
  });

  it("hebben geen vergeten vertalingen", () => {
    const nl = new Map(leaves(jobsLabels.nl));
    const same = leaves(jobsLabels.en)
      .filter(([path, value]) => typeof value === "string" && nl.get(path) === value)
      .map(([path]) => path);
    expect(same).toEqual([]);
  });

  it("schrijven de uitkomst van een ronde als één zin", () => {
    expect(jobsLabels.nl.flushDone({ done: 2, waiting: 1, retried: 0, failed: 1 })).toContain("2 klaar");
    expect(jobsLabels.en.retryDone(1)).toBe("One job is queued again.");
  });
});
