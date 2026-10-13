/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { passwordLabels } from "./auth-password";

function leaves(value: unknown, path = ""): [string, unknown][] {
  if (typeof value !== "object" || value === null) return [[path, value]];
  return Object.entries(value).flatMap(([key, child]) => leaves(child, path === "" ? key : `${path}.${key}`));
}

describe("de teksten van de wachtwoordlogin", () => {
  it("hebben dezelfde sleutels in beide talen", () => {
    expect(leaves(passwordLabels.en).map(([path]) => path)).toEqual(leaves(passwordLabels.nl).map(([path]) => path));
  });

  it("hebben geen vergeten vertalingen", () => {
    /* Dezelfde woorden in beide talen, elk met een reden. */
    const allowed = new Set(["adminTab", "adminTitle", "mfaColumn"]);
    const nl = new Map(leaves(passwordLabels.nl));
    const same = leaves(passwordLabels.en)
      .filter(([path, value]) => typeof value === "string" && !allowed.has(path) && nl.get(path) === value)
      .map(([path]) => path);
    expect(same).toEqual([]);
  });

  it("zetten de koppeling in de mail als losse regel, zodat hij een knop wordt", () => {
    const body = passwordLabels.nl.inviteBody("Anna", "https://voorbeeld.invalid/sign-in/invite/abc");
    expect(body.split("\n")).toContain("https://voorbeeld.invalid/sign-in/invite/abc");
  });
});
