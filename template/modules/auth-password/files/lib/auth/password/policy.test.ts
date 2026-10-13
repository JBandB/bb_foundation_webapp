/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { checkPassword } from "./policy";

describe("checkPassword", () => {
  it("eist lengte en weigert het eigen adres erin", () => {
    expect(checkPassword("kort", "anna@voorbeeld.invalid")).toEqual({ ok: false, problem: "tooShort" });
    expect(checkPassword("x".repeat(201), "anna@voorbeeld.invalid")).toEqual({ ok: false, problem: "tooLong" });
    expect(checkPassword("Anna.Smit-wachtwoord", "anna.smit@voorbeeld.invalid")).toEqual({ ok: false, problem: "containsEmail" });
    expect(checkPassword("correct paard batterij nietje", "anna@voorbeeld.invalid")).toEqual({ ok: true });
  });

  it("laat een korte lokale naam door en controleert de herhaling", () => {
    expect(checkPassword("jan is een naam die mag", "jan@voorbeeld.invalid")).toEqual({ ok: true });
    expect(checkPassword("correct paard batterij", "anna@voorbeeld.invalid", "correct paard baterij")).toEqual({ ok: false, problem: "mismatch" });
    expect(checkPassword("correct paard batterij", "anna@voorbeeld.invalid", "correct paard batterij")).toEqual({ ok: true });
  });
});
