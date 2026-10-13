/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { ADMIN_ROLES, type AppRole } from "@/lib/auth/roles";
import { PROJECT } from "@/lib/project/config.generated";

/** Is tweestapsverificatie verplicht voor iemand met deze rollen, volgens `auth.password.mfaRequiredFor`? */
export function mfaRequiredFor(roles: readonly AppRole[], policy: "admins" | "everyone" | "nobody" = PROJECT.password.mfaRequiredFor): boolean {
  if (policy === "everyone") return true;
  if (policy === "nobody") return false;
  return roles.some((role) => ADMIN_ROLES.includes(role));
}
