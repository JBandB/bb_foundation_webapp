/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { base32Decode, base32Encode, counterFor, generateTotpSecret, otpauthUrl, totpCode, verifyTotp } from "./totp";

/* Het testgeheim uit RFC 6238, "12345678901234567890", als base32. */
const RFC_SECRET = "GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ";

describe("totp", () => {
  it("rekent de vectoren uit RFC 6238 na (de laatste zes cijfers van de achtcijferige codes)", () => {
    expect(totpCode(RFC_SECRET, counterFor(new Date(59 * 1000)))).toBe("287082");
    expect(totpCode(RFC_SECRET, counterFor(new Date(1111111109 * 1000)))).toBe("081804");
    expect(totpCode(RFC_SECRET, counterFor(new Date(1234567890 * 1000)))).toBe("005924");
  });

  it("accepteert de code van nu en van één vak ernaast, en niets anders", () => {
    const now = new Date(1234567890 * 1000);
    expect(verifyTotp(RFC_SECRET, "005924", now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, "005 924", now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, counterFor(now) - 1), now)).toBe(true);
    expect(verifyTotp(RFC_SECRET, totpCode(RFC_SECRET, counterFor(now) + 2), now)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "000000", now)).toBe(false);
    expect(verifyTotp(RFC_SECRET, "12345", now)).toBe(false);
  });

  it("maakt een geheim van 32 tekens base32 dat heen en terug gaat", () => {
    const secret = generateTotpSecret();
    expect(secret).toMatch(/^[A-Z2-7]{32}$/);
    expect(base32Encode(base32Decode(secret))).toBe(secret);
    expect(Buffer.from(base32Decode(RFC_SECRET)).toString("ascii")).toBe("12345678901234567890");
  });

  it("schrijft de otpauth-koppeling met uitgever en account", () => {
    const url = otpauthUrl("Rooster De Weide", "anna@voorbeeld.invalid", RFC_SECRET);
    expect(url.startsWith("otpauth://totp/Rooster%20De%20Weide:anna%40voorbeeld.invalid?")).toBe(true);
    expect(url).toContain(`secret=${RFC_SECRET}`);
    expect(url).toContain("digits=6");
  });
});
