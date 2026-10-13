/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { boxKey, open, seal } from "./secret-box";

const key = boxKey("een-lang-genoeg-testgeheim-van-het-project", "test");
const other = boxKey("een-ander-testgeheim-dat-niet-hetzelfde-is", "test");

describe("secret-box", () => {
  it("sluit en opent, met een andere cijfertekst per keer", () => {
    const boxed = seal("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", key);
    expect(boxed.startsWith("v1$")).toBe(true);
    expect(seal("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ", key)).not.toBe(boxed);
    expect(open(boxed, key)).toBe("GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ");
  });

  it("geeft niets terug bij een andere sleutel of een aangepaste tekst", () => {
    const boxed = seal("geheim", key);
    expect(open(boxed, other)).toBeUndefined();
    expect(open(`${boxed.slice(0, -2)}AA`, key)).toBeUndefined();
    expect(open("v0$a$b$c", key)).toBeUndefined();
  });

  it("weigert een te kort geheim als basis voor een sleutel", () => {
    expect(() => boxKey("kort", "test")).toThrow(/te kort/);
  });
});
