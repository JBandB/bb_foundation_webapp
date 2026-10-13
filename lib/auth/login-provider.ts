/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wat een inlogmodule aan de kern levert. De kern kent geen Entra en geen wachtwoorden: hij kent
 * een lijst van deze objecten (`LOGIN_PROVIDERS` in lib/project/registry.generated.ts) plus de
 * dev-login, en de jwt-callback vraagt het juiste object om de ingelogde persoon in `users` te
 * vinden of aan te maken.
 */

import type { Account, User } from "next-auth";
import type { Provider } from "next-auth/providers";
import type { SyncedUser } from "./user-sync";

export interface LoginProvider {
  /** De id waarop de jwt-callback dit pad herkent; dezelfde als die van de Auth.js-provider. */
  readonly id: string;
  /** Maakt de Auth.js-provider. Als functie, zodat de omgeving pas bij het opstarten gelezen wordt. */
  readonly create: () => Provider;
  /** Vindt of maakt de rij in `users` voor wie net inlogde, en geeft hem terug. */
  readonly resolve: (user: User, account: Account) => Promise<SyncedUser>;
  /**
   * Waar de rollen voor de sessie vandaan komen: uit het token van de module (`user.roles`), of uit
   * `users.roles` zoals een beheerder ze in de tool heeft gezet.
   */
  readonly rolesFrom: "token" | "database";
}
