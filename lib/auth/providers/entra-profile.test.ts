/* template-owned (module auth-entra). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { APP_ROLES } from "../roles.generated";
import { entraUserFromProfile } from "./entra-profile";

/* De eerste rol uit project.config.json, want dit bestand reist mee naar projecten met andere rolnamen. */
const role = APP_ROLES[0];

describe("entraUserFromProfile", () => {
  it("leest naam, adres, object-id en rollen", () => {
    expect(entraUserFromProfile({ sub: "s", oid: "o", name: "Anna", email: "anna@voorbeeld.invalid", roles: [role, "x"] })).toEqual({
      id: "s",
      oid: "o",
      name: "Anna",
      email: "anna@voorbeeld.invalid",
      roles: [role],
    });
  });

  it("valt terug op preferred_username en laat oid weg als die er niet is", () => {
    const user = entraUserFromProfile({ preferred_username: "anna@voorbeeld.invalid" });
    expect(user.name).toBe("anna@voorbeeld.invalid");
    expect(user.email).toBe("anna@voorbeeld.invalid");
    expect("oid" in user).toBe(false);
    expect(user.roles).toEqual([]);
  });
});
