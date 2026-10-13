/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./hash";

describe("wachtwoordhash", () => {
  it("herkent het juiste wachtwoord en weigert een ander, met een eigen zout per keer", async () => {
    const first = await hashPassword("correct paard batterij nietje");
    const second = await hashPassword("correct paard batterij nietje");
    expect(first).not.toBe(second);
    expect(first.startsWith("scrypt$16384$")).toBe(true);
    expect(await verifyPassword("correct paard batterij nietje", first)).toBe(true);
    expect(await verifyPassword("correct paard batterij nietje", second)).toBe(true);
    expect(await verifyPassword("Correct paard batterij nietje", first)).toBe(false);
  });

  it("weigert een onleesbare opslag zonder te gooien", async () => {
    expect(await verifyPassword("x", "")).toBe(false);
    expect(await verifyPassword("x", "bcrypt$10$abc$def")).toBe(false);
    expect(await verifyPassword("x", "scrypt$1000$YWJj$ZGVm")).toBe(false);
  });
});
