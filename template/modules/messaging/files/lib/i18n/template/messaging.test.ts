/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { messagingLabels } from "./messaging";

function leaves(value: unknown, path = ""): [string, unknown][] {
  if (typeof value !== "object" || value === null) return [[path, value]];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, path === "" ? key : `${path}.${key}`));
}

describe("de teksten van de module messaging", () => {
  it("hebben dezelfde sleutels in beide talen", () => {
    expect(leaves(messagingLabels.en).map(([path]) => path)).toEqual(leaves(messagingLabels.nl).map(([path]) => path));
  });

  it("hebben geen vergeten vertalingen", () => {
    /* Dezelfde woorden in beide talen, elk met een reden. */
    const allowed = new Set(["channelMail", "channelTeams", "thresholdUnit.days", "filterStatus", "colMoment", "colStatus", "statusSent", "retrying", "flushing", "loginHelpSending", "settingSave"]);
    const nl = new Map(leaves(messagingLabels.nl));
    const same = leaves(messagingLabels.en)
      .filter(([path, value]) => typeof value === "string" && !allowed.has(path) && nl.get(path) === value)
      .map(([path]) => path);
    expect(same).toEqual([]);
  });

  it("schrijven de vastloopmelding met het aantal erin", () => {
    expect(messagingLabels.nl.stuckBody("jobs:crm", 3)).toContain("3 berichten of taken wachten");
    expect(messagingLabels.en.stuckBody("outbox", 1)).toContain("1 message or job is waiting");
  });
});
