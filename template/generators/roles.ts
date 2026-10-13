/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Schrijft lib/auth/roles.generated.ts uit `auth.roles` in project.config.json: de waarden, het label
 * in de taal van de interface, en welke rollen beheerder zijn.
 */

import type { ProjectConfig } from "../lib/config-schema";
import { generatedHeaderLine } from "../lib/header";

const quote = (value: string): string => JSON.stringify(value);

export function generateRoles(config: ProjectConfig): string {
  const language = config.project.uiLanguage;
  const roles = config.auth.roles;

  return [
    generatedHeaderLine("lib/auth/roles.generated.ts", "roles") ?? "",
    "",
    "/**",
    " * De rollen van dit project, uit `auth.roles` in project.config.json. Bij Entra zijn dit exact de",
    " * waarden van de app roles in de tenant; bij de wachtwoordlogin de waarden in `users.roles`.",
    " */",
    `export const APP_ROLES = [${roles.map((role) => quote(role.value)).join(", ")}] as const;`,
    "",
    "export type AppRole = (typeof APP_ROLES)[number];",
    "",
    "/** Het label per rol, in de taal van de interface. */",
    "export const ROLE_LABELS: Readonly<Record<AppRole, string>> = {",
    ...roles.map((role) => `  ${quote(role.value)}: ${quote(role.label[language])},`),
    "};",
    "",
    "/** De rollen met `admin: true`: zij mogen alles, ook Beheer. */",
    `export const ADMIN_ROLES: readonly AppRole[] = [${roles
      .filter((role) => role.admin)
      .map((role) => quote(role.value))
      .join(", ")}];`,
    "",
  ].join("\n");
}
