/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */

/**
 * De rechten die het template meebrengt. De rechten van het project staan in `actions.ts`, en de
 * lijst die `can()` gebruikt is de som van de twee.
 *
 * Een recht van een module die niet is toegepast (zoals `files:read` zonder de module files) staat
 * hier toch: een recht dat niemand gebruikt doet niets, en zo hoeft de lijst niet per module te
 * veranderen.
 */
export const CORE_ACTIONS = [
  /** Toegang beheren: wie er in de tool kan en met welke rol. */
  "admin:access",
  /** Beheer, Systeem: de stand van de tool, de koppelingen en de feedback. */
  "admin:system",
  /** Berichten beheren: wie wat ontvangt (module messaging). */
  "admin:messages",
  /** Bestanden downloaden en uploaden (module files). */
  "files:read",
  "files:write",
] as const;

export type CoreAction = (typeof CORE_ACTIONS)[number];
