/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Alle inlogmethoden van dit project: die van de toegepaste modules (uit het gegenereerde register)
 * plus de dev-login als die aanstaat. Eén lijst voor auth.ts (de providers) en voor de jwt-callback
 * (het vinden van de gebruiker), zodat die twee niet uiteen kunnen lopen.
 */

import { LOGIN_PROVIDERS } from "@/lib/project/registry.generated";
import type { LoginProvider } from "../login-provider";
import { devLoginEnabled, devLoginProvider } from "./dev-login";

export function loginProviders(): readonly LoginProvider[] {
  return devLoginEnabled ? [...LOGIN_PROVIDERS, devLoginProvider] : LOGIN_PROVIDERS;
}

export function loginProviderById(id: string): LoginProvider | undefined {
  return loginProviders().find((provider) => provider.id === id);
}
