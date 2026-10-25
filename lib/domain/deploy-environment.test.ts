/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { deployEnvironment } from "./deploy-environment";

describe("deployEnvironment", () => {
  it("volgt APP_ENV als die er is, ook boven VERCEL_ENV", () => {
    expect(deployEnvironment({ APP_ENV: "local" })).toBe("local");
    expect(deployEnvironment({ APP_ENV: " preview " })).toBe("preview");
    expect(deployEnvironment({ APP_ENV: "production", VERCEL_ENV: "preview" })).toBe("production");
  });

  it("valt terug op VERCEL_ENV", () => {
    expect(deployEnvironment({ VERCEL_ENV: "production" })).toBe("production");
    expect(deployEnvironment({ VERCEL_ENV: "preview" })).toBe("preview");
  });

  it("is onbekend zonder herkenbare waarde, en dus nooit vanzelf lokaal", () => {
    expect(deployEnvironment({})).toBe("unknown");
    expect(deployEnvironment({ APP_ENV: "staging" })).toBe("unknown");
    expect(deployEnvironment({ VERCEL_ENV: "development" })).toBe("unknown");
    expect(deployEnvironment({ APP_ENV: "", VERCEL_ENV: "" })).toBe("unknown");
  });
});
