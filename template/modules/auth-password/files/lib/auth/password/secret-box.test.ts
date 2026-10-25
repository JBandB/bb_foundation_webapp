/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { boxKey, open, openWithKeys, seal } from "./secret-box";

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

  it("opent met de eerste sleutel die past, en zegt of het een oude was", () => {
    const viaNieuw = seal("geheim", key);
    expect(openWithKeys(viaNieuw, [key, other])).toEqual({ plain: "geheim", stale: false });
    const viaOud = seal("geheim", other);
    expect(openWithKeys(viaOud, [key, other])).toEqual({ plain: "geheim", stale: true });
    expect(openWithKeys(viaOud, [key])).toBeUndefined();
  });

  it("weigert een te kort geheim als basis voor een sleutel", () => {
    expect(() => boxKey("kort", "test")).toThrow(/te kort/);
  });

  it("weigert een ingekorte tag, ook als het begin klopt", () => {
    const boxed = seal("JBSWY3DPEHPK3PXP", key);
    const [version, iv, tag, body] = boxed.split("$");
    const full = Buffer.from(tag ?? "", "base64url");
    expect(full.length).toBe(16);
    for (const length of [4, 8, 12, 15]) {
      const short = full.subarray(0, length).toString("base64url");
      expect(open([version, iv, short, body].join("$"), key)).toBeUndefined();
    }
    expect(open(boxed, key)).toBe("JBSWY3DPEHPK3PXP");
  });
});
