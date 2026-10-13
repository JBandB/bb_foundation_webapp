/* template-generated (registry) uit project.config.json. Niet bewerken: pnpm template:generate schrijft hem opnieuw. */
/**
 * Wat de toegepaste modules aan de kern aanmelden, aan de serverkant: inlogmethoden, koppelingen,
 * beheertabbladen en bestemmingen in de rail. De kern importeert alleen dit bestand en kent geen
 * enkele module bij naam; een module die niet is toegepast, staat hier niet en wordt dus ook niet
 * gebundeld.
 *
 * De componenten voor het inlogscherm staan apart in `ui-registry.generated.ts`: die importeren
 * `signIn` uit auth.ts, en auth.ts leest dit bestand, dus samen zou dat een kring zijn.
 */
import type { HealthProvider } from "@/lib/integrations/health";
import type { LoginProvider } from "@/lib/auth/login-provider";
import type { AdminTab } from "@/lib/project/admin-tab";
import type { ModuleNavItem } from "@/lib/project/nav-item";
import { entraLoginProvider } from "@/lib/auth/providers/entra-login";

/** De inlogmethoden, in volgorde. De dev-login komt er lokaal bij in lib/auth/providers/index.ts. */
export const LOGIN_PROVIDERS: readonly LoginProvider[] = [entraLoginProvider];

/** De koppelingen die Beheer, Systeem toont met hun stand. */
export const HEALTH_PROVIDERS: readonly HealthProvider[] = [];

/** De tabbladen die modules onder Beheer zetten, na die van de kern en vóór die van het project. */
export const ADMIN_TABS: readonly AdminTab[] = [];

/** De bestemmingen die modules in de rail zetten, na die van het project en vóór Beheer. */
export const NAV_ITEMS: readonly ModuleNavItem[] = [];
