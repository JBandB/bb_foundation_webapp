/* template-generated (roles) uit project.config.json. Niet bewerken: pnpm template:generate schrijft hem opnieuw. */

/**
 * De rollen van dit project, uit `auth.roles` in project.config.json. Bij Entra zijn dit exact de
 * waarden van de app roles in de tenant; bij de wachtwoordlogin de waarden in `users.roles`.
 */
export const APP_ROLES = ["admin", "member"] as const;

export type AppRole = (typeof APP_ROLES)[number];

/** Het label per rol, in de taal van de interface. */
export const ROLE_LABELS: Readonly<Record<AppRole, string>> = {
  "admin": "Beheerder",
  "member": "Lid",
};

/** De rollen met `admin: true`: zij mogen alles, ook Beheer. */
export const ADMIN_ROLES: readonly AppRole[] = ["admin"];
