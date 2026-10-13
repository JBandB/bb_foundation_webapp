/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import type { NavItem } from "@/components/nav-rail";
import type { Actor } from "@/lib/auth/actor";

/**
 * Een bestemming in de rail die een module aanmeldt via `registry.navItems` in het manifest. De
 * functie krijgt de actor en geeft het item terug, of null als deze persoon het niet hoort te zien.
 * De volgorde bepaalt de kern (app/(app)/layout.tsx): project, modules, Beheer.
 */
export type ModuleNavItem = (actor: Actor) => NavItem | null;
