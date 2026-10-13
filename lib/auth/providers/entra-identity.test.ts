/* template-owned (module auth-entra). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { entraIdentity } from "./entra-identity";

describe("entraIdentity", () => {
  it("neemt het object-id boven de sub, en de sub als terugval", () => {
    expect(entraIdentity({ oid: " o " }, { providerAccountId: "s" })).toEqual({ objectId: "o", subject: "s" });
    expect(entraIdentity({}, { providerAccountId: "s" })).toEqual({ objectId: "s", subject: "s" });
    expect(entraIdentity({ oid: "" }, {})).toEqual({ objectId: "", subject: "" });
  });
});
