/* template-owned (module auth-entra). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Entra als inlogmethode voor de kern: de Auth.js-provider, en hoe de ingelogde persoon in `users`
 * terechtkomt. De rollen komen uit het token en worden alleen als cache in `users.roles` gezet.
 */

import type { LoginProvider } from "../login-provider";
import { normaliseDisplayName } from "../display-name";
import { parseRoles } from "../roles";
import { syncUserFromToken } from "../user-sync";
import { ENTRA_PROVIDER_ID, entraProvider } from "./entra";
import { entraIdentity } from "./entra-identity";

export const entraLoginProvider: LoginProvider = {
  id: ENTRA_PROVIDER_ID,
  rolesFrom: "token",
  create: entraProvider,
  resolve: (user, account) => {
    /* Nooit `user.id`: dat zet Auth.js bij elke login op een willekeurige UUID. Zie entra-identity.ts. */
    const identity = entraIdentity(user, account);
    const email = user.email ?? "";
    return syncUserFromToken({
      externalId: identity.objectId,
      email,
      displayName: normaliseDisplayName(user.name ?? email),
      roles: parseRoles(user.roles),
    });
  },
};
