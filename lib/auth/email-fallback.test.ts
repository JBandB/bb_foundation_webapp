/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { mayClaimByEmail } from "./email-fallback";

const OID = "6f1c2b9a-3d4e-4f5a-8b7c-9d0e1f2a3b4c";
const OTHER_OID = "0a9b8c7d-6e5f-4a3b-9c2d-1e0f9a8b7c6d";

describe("mayClaimByEmail", () => {
  it("laat een echte login een dev-rij uit de seed overnemen", () => {
    expect(mayClaimByEmail("dev:anna@example.org", OID)).toBe(true);
  });

  it("laat een echte login geen rij met een andere identiteit overnemen", () => {
    expect(mayClaimByEmail(OTHER_OID, OID)).toBe(false);
    expect(mayClaimByEmail("local:1c7f0c1e-0000-4000-8000-000000000000", OID)).toBe(false);
  });

  it("laat een rij zonder of met een andere plaatshouder niet overnemen", () => {
    expect(mayClaimByEmail("", OID)).toBe(false);
    expect(mayClaimByEmail("invite:anna@example.org", OID)).toBe(false);
  });

  it("laat de dev-login elke rij op e-mail vinden", () => {
    expect(mayClaimByEmail(OID, "dev:anna@example.org")).toBe(true);
    expect(mayClaimByEmail("dev:anna@example.org", "dev:anna@example.org")).toBe(true);
  });

  it("let op het voorvoegsel en niet op dev: ergens in de waarde", () => {
    expect(mayClaimByEmail("xdev:anna@example.org", OID)).toBe(false);
  });
});
