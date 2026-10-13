/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { normaliseDisplayName } from "./display-name";

describe("normaliseDisplayName", () => {
  it("knipt een organisatiesuffix af", () => {
    expect(normaliseDisplayName("Anna de Vries | Organisatie")).toBe("Anna de Vries");
    expect(normaliseDisplayName("Anna de Vries (Extern)")).toBe("Anna de Vries");
    expect(normaliseDisplayName("Anna de Vries - Organisatie")).toBe("Anna de Vries");
  });

  it("laat een gewone naam met rust en vouwt spaties samen", () => {
    expect(normaliseDisplayName("Anna  de   Vries")).toBe("Anna de Vries");
    expect(normaliseDisplayName("| Alleen suffix")).toBe("| Alleen suffix");
  });
});
