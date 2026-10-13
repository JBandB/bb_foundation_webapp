/* template-owned (module auth-entra). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import type { User } from "next-auth";
import { parseRoles } from "../roles";

/**
 * Van het Entra-token naar onze gebruiker, bij het inloggen. Puur, zodat het los te testen is.
 *
 * **Twee id's, elk met een eigen taak.** `sub` is per applicatie versleuteld en dus geen GUID. Het
 * object-id (`oid`) is wel een GUID, stabiel per persoon in de tenant, en het id dat Graph kent. De
 * identiteit in `users` is het object-id; `sub` dient alleen om een account van vóór een reparatie te
 * herkennen. Zie entra-identity.ts.
 */

/** De claims die we lezen. Alles `unknown`, want een token is invoer van buiten. */
export type EntraClaims = Partial<Record<"sub" | "oid" | "name" | "email" | "preferred_username" | "roles", unknown>>;

export function entraUserFromProfile(profile: EntraClaims): User {
  const name =
    typeof profile.name === "string" && profile.name !== ""
      ? profile.name
      : typeof profile.preferred_username === "string"
        ? profile.preferred_username
        : "Onbekend";
  const email =
    typeof profile.email === "string" && profile.email !== ""
      ? profile.email
      : typeof profile.preferred_username === "string"
        ? profile.preferred_username
        : "";
  const oid = profile.oid;

  return {
    /*
     * Auth.js vervangt dit `id` door een willekeurige UUID en bewaart het als
     * `account.providerAccountId`. Lees de identiteit dus via `entraIdentity`, nooit via `user.id`.
     */
    id: typeof profile.sub === "string" ? profile.sub : "",
    ...(typeof oid === "string" && oid !== "" ? { oid } : {}),
    name,
    email,
    roles: parseRoles(profile.roles),
  };
}
