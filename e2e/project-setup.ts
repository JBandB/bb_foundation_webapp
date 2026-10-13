import type { Pool } from "@neondatabase/serverless";

/**
 * Wat de e2e-suite van dit project nodig heeft voordat hij begint: testrijen terugzetten, een
 * fixture neerzetten, iets wat een vorige run heeft achtergelaten weghalen. Wordt aangeroepen door
 * `e2e/global-setup.ts`, na het wakker maken van de database.
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export async function projectSetup(_pool: Pool): Promise<void> {
  /* Nog niets. */
}
