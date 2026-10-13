/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { callerAddress, windowStart } from "./rate-limit";

describe("rate limit, de pure delen", () => {
  it("rondt af op de vloer van het venster", () => {
    expect(windowStart(new Date("2026-10-02T10:47:13Z"), 60).toISOString()).toBe("2026-10-02T10:00:00.000Z");
    expect(windowStart(new Date("2026-10-02T10:47:13Z"), 15).toISOString()).toBe("2026-10-02T10:45:00.000Z");
  });

  it("neemt het eerste adres uit x-forwarded-for en valt terug op één gedeelde sleutel", () => {
    expect(callerAddress("203.0.113.5, 10.0.0.1")).toBe("203.0.113.5");
    expect(callerAddress(null)).toBe("onbekend");
    expect(callerAddress("  ")).toBe("onbekend");
  });
});
