/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { initialsOf } from "./initials";

describe("initialsOf", () => {
  it("neemt het eerste en het laatste woord", () => {
    expect(initialsOf("Anna de Vries")).toBe("AV");
    expect(initialsOf("  jan   jansen ")).toBe("JJ");
  });

  it("geeft bij één naam twee letters, en bij niets een vraagteken", () => {
    expect(initialsOf("Mohammed")).toBe("MO");
    expect(initialsOf("")).toBe("?");
    expect(initialsOf("& |")).toBe("?");
  });

  it("slaat woorden over die niet met een letter beginnen", () => {
    expect(initialsOf("Sanne Vermeer | Organisatie")).toBe("SO");
    expect(initialsOf("Ella & Co")).toBe("EC");
  });
});
