/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { APP_ROLES } from "./roles.generated";
import { actorFromToken, tokenText } from "./token";

/* De eerste rol uit project.config.json, want dit bestand reist mee naar projecten met andere rolnamen. */
const role = APP_ROLES[0];

describe("actorFromToken", () => {
  it("leest onze velden en valideert de rollen", () => {
    const actor = actorFromToken({
      userId: "u1",
      organisationId: "o1",
      name: "Anna",
      email: "anna@voorbeeld.invalid",
      initials: "AN",
      roles: [role, "onzin"],
    });
    expect(actor).toEqual({ id: "u1", organisationId: "o1", name: "Anna", email: "anna@voorbeeld.invalid", initials: "AN", roles: [role] });
  });

  it("laat een kapotte cookie leeg in plaats van te gooien", () => {
    const actor = actorFromToken({ roles: role });
    expect(actor.id).toBe("");
    expect(actor.initials).toBe("?");
    expect(actor.roles).toEqual([]);
    expect(tokenText(42, "x")).toBe("x");
  });
});
