/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { ACTIONS } from "./actions";
import { allowedActions, assertCan, AuthorisationError, can } from "./can";
import { MATRIX } from "./matrix";
import { ADMIN_ROLES, APP_ROLES, isAdmin, parseRoles, roleLabel } from "./roles";

/**
 * De rechtenmatrix van het project, getest over de projectbestanden heen: wat hier staat moet voor
 * elke invulling van `actions.ts`, `matrix.ts` en de rollen uit project.config.json waar blijven.
 * Daarom geen letterlijke rolnamen: dit bestand reist met het template mee naar elk project.
 */
const first = APP_ROLES[0];

describe("parseRoles", () => {
  it("leest een rollenlijst en gooit onbekende rollen weg", () => {
    expect(parseRoles([...APP_ROLES])).toEqual([...APP_ROLES]);
    expect(parseRoles([first, "superuser", first.toUpperCase()])).toEqual([first]);
    expect(parseRoles([first, first])).toEqual([first]);
  });

  it("levert een lege lijst bij een ontbrekende of rare claim", () => {
    expect(parseRoles(undefined)).toEqual([]);
    expect(parseRoles(null)).toEqual([]);
    expect(parseRoles(first)).toEqual([]);
    expect(parseRoles([1, {}, false])).toEqual([]);
  });
});

describe("can", () => {
  it("laat een actor zonder rol niets doen", () => {
    for (const action of ACTIONS) expect(can({ roles: [] }, action)).toBe(false);
  });

  it("geeft elke beheerdersrol alles", () => {
    expect(ADMIN_ROLES.length).toBeGreaterThan(0);
    for (const role of ADMIN_ROLES) {
      for (const action of ACTIONS) expect(can({ roles: [role] }, action), `${role} ${action}`).toBe(true);
    }
  });

  it("kent elke rol een regel in de matrix toe, en elke regel alleen bestaande rechten", () => {
    for (const role of APP_ROLES) {
      expect(MATRIX[role], role).toBeDefined();
      for (const action of allowedActions(role)) expect(ACTIONS, `${role}: ${action}`).toContain(action);
    }
  });

  it("telt rollen bij elkaar op", () => {
    const everything = { roles: [...APP_ROLES] };
    for (const action of ACTIONS) expect(can(everything, action)).toBe(true);
  });

  it("gooit een neutrale fout met de actie erop", () => {
    const first = ACTIONS[0];
    expect(() => assertCan({ roles: [] }, first)).toThrow(AuthorisationError);
    try {
      assertCan({ roles: [] }, first);
    } catch (error) {
      expect(error).toBeInstanceOf(AuthorisationError);
      if (error instanceof AuthorisationError) {
        expect(error.action).toBe(first);
        expect(error.message).not.toContain(first);
      }
    }
  });
});

describe("rollen", () => {
  it("herkent een beheerder en labelt de hoogste rol", () => {
    const admin = ADMIN_ROLES[0];
    if (admin === undefined) throw new Error("er is geen beheerdersrol");
    expect(isAdmin([admin])).toBe(true);
    expect(isAdmin([])).toBe(false);
    expect(roleLabel([admin])).not.toBe("");
    expect(roleLabel([])).not.toBe("");
  });
});
