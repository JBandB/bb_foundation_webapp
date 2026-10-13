/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import type { SubNavItem } from "@/components/ui/sub-nav";
import type { Actor } from "@/lib/auth/actor";

/**
 * Een tabblad onder Beheer dat een module aanmeldt via `registry.adminTabs` in het manifest. De
 * functie krijgt de actor en geeft het tabblad terug, of null als deze persoon het niet mag zien:
 * de rechtencontrole hoort bij de module, de volgorde bij de kern (app/(app)/admin/tabs.ts).
 */
export type AdminTab = (actor: Actor) => SubNavItem | null;
