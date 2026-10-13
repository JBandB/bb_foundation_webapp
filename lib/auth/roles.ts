/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Rollen komen uit de inlogmodule: bij Entra uit de roles-claim van het token, bij de
 * wachtwoordlogin uit `users.roles`. Nooit uit een cookie, nooit uit de request body. Zie CLAUDE.md
 * regel 1.
 *
 * De waarden staan in `roles.generated.ts`, afgeleid uit project.config.json. Hier staat alleen het
 * lezen ervan.
 */

import { templateLabels } from "@/lib/i18n/template";
import { ADMIN_ROLES, APP_ROLES, ROLE_LABELS, type AppRole } from "./roles.generated";

export { ADMIN_ROLES, APP_ROLES, ROLE_LABELS } from "./roles.generated";
export type { AppRole } from "./roles.generated";

export function isAppRole(value: unknown): value is AppRole {
  return typeof value === "string" && (APP_ROLES as readonly string[]).includes(value);
}

/**
 * Leest een rollenlijst van buiten. Onbekende rollen worden weggegooid in plaats van doorgelaten: een
 * tikfout in de tenant of in de database mag geen rechten opleveren die hier niet gedefinieerd zijn.
 * Een gebruiker zonder geldige rol houdt een lege lijst over en mag daarmee niets, en dat is het
 * veilige antwoord.
 */
export function parseRoles(claim: unknown): AppRole[] {
  if (!Array.isArray(claim)) return [];
  const seen = new Set<AppRole>();
  for (const value of claim) {
    if (isAppRole(value)) seen.add(value);
  }
  return [...seen];
}

/** Draagt deze rollenlijst een beheerdersrol? */
export function isAdmin(roles: readonly AppRole[]): boolean {
  return roles.some((role) => ADMIN_ROLES.includes(role));
}

/**
 * Eén label voor in de rail, ook als iemand meerdere rollen heeft: de beheerdersrol als die er is,
 * anders de eerste rol in de volgorde van de configuratie, en anders "geen rol".
 */
export function roleLabel(roles: readonly AppRole[]): string {
  const admin = ADMIN_ROLES.find((role) => roles.includes(role));
  if (admin !== undefined) return ROLE_LABELS[admin];
  const first = APP_ROLES.find((role) => roles.includes(role));
  return first === undefined ? templateLabels.role.none : ROLE_LABELS[first];
}
