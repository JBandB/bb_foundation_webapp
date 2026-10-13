/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Typeuitbreidingen voor Auth.js. Staan hier en niet in auth.ts, want een module-augmentatie heeft de
 * originele module in het programma nodig en dat betekent een import die verder niets doet.
 *
 * Wat er in de sessie zit is met opzet klein: een id, de organisatie, een naam, initialen en de
 * rollen. De sessiecookie is geen cache voor domeindata, zie CLAUDE.md regel 4.
 *
 * De JWT wordt hier niet geaugmenteerd. Waarom niet staat in lib/auth/token.ts.
 */

import type { Actor } from "@/lib/auth/actor";
import type { AppRole } from "@/lib/auth/roles";

declare module "next-auth" {
  interface Session {
    user: Actor;
  }

  interface User {
    /** Gezet door de profile-callback van een inlogmodule en door de dev-login. */
    roles?: AppRole[];
    /** Het object-id uit het Entra-token (`oid`), naast `id` dat de `sub` is. */
    oid?: string;
  }
}
