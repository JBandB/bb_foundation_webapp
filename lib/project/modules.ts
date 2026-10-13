/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { PROJECT } from "./config.generated";

/**
 * Welke modules van het template dit project heeft toegepast. Voor code die zich anders gedraagt
 * naar gelang een module er is, zoals een tabblad onder Beheer dat alleen verschijnt met de module.
 * Code van een module zelf hoeft dit niet te vragen: die is er alleen als de module er is.
 */
export const MODULE_NAMES = ["core", "auth-entra", "auth-password", "jobs", "messaging", "files"] as const;
export type ModuleName = (typeof MODULE_NAMES)[number];

export function hasModule(name: ModuleName): boolean {
  return name === "core" || PROJECT.modules.includes(name);
}
