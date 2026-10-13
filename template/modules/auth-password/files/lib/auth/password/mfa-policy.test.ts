/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { ADMIN_ROLES, APP_ROLES } from "@/lib/auth/roles";
import { mfaRequiredFor } from "./mfa-policy";

describe("mfaRequiredFor", () => {
  const admin = ADMIN_ROLES[0];
  const other = APP_ROLES.find((role) => !ADMIN_ROLES.includes(role));

  it("volgt het beleid uit de configuratie", () => {
    if (admin === undefined) throw new Error("er is geen beheerdersrol");
    expect(mfaRequiredFor([admin], "admins")).toBe(true);
    expect(mfaRequiredFor([admin], "nobody")).toBe(false);
    expect(mfaRequiredFor([], "everyone")).toBe(true);
    expect(mfaRequiredFor([], "admins")).toBe(false);
    if (other !== undefined) expect(mfaRequiredFor([other], "admins")).toBe(false);
  });
});
