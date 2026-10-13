/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { contrast, ensureContrast, hexToOklch, oklchToHex, withLightness } from "./colour";

describe("kleurrekenwerk", () => {
  it("gaat heen en terug door OKLCH zonder de kleur te veranderen", () => {
    for (const hex of ["#1f4e79", "#0f766e", "#e07b00", "#ffffff", "#000000", "#5b8c3a", "#f6f7f9"]) {
      expect(oklchToHex(hexToOklch(hex))).toBe(hex);
    }
  });

  it("rekent het WCAG-contrast zoals de controle", () => {
    expect(contrast("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrast("#ffffff", "#000000")).toBeCloseTo(21, 5);
    expect(contrast("#1f4e79", "#ffffff")).toBeGreaterThan(8);
    expect(contrast("#e07b00", "#ffffff")).toBeLessThan(4.5);
  });

  it("houdt de tint bij een andere lichtheid, en blijft binnen sRGB", () => {
    const light = withLightness("#e07b00", 0.9);
    const dark = withLightness("#e07b00", 0.3);
    expect(Math.abs(hexToOklch(light).h - hexToOklch("#e07b00").h)).toBeLessThan(3);
    expect(hexToOklch(dark).l).toBeLessThan(hexToOklch(light).l);
  });

  it("schuift een voorgrond op tot het contrast klopt, de goede kant op", () => {
    const onWhite = ensureContrast("#e07b00", "#ffffff", 4.5);
    expect(onWhite).toBeDefined();
    if (onWhite !== undefined) {
      expect(contrast(onWhite, "#ffffff")).toBeGreaterThanOrEqual(4.5);
      expect(hexToOklch(onWhite).l).toBeLessThan(hexToOklch("#e07b00").l);
    }
    const onDark = ensureContrast("#1f4e79", "#111418", 4.5);
    expect(onDark).toBeDefined();
    if (onDark !== undefined) expect(hexToOklch(onDark).l).toBeGreaterThan(hexToOklch("#1f4e79").l);
    expect(ensureContrast("#777777", "#808080", 21)).toBeUndefined();
  });
});
