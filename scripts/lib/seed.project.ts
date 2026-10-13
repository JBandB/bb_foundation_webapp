import type { ScriptDb } from "./connection";

export interface SeedContext {
  readonly organisationId: string;
  /** De dev-accounts uit project.config.json, op e-mailadres, zodat testgegevens aan iemand kunnen hangen. */
  readonly userIdsByEmail: ReadonlyMap<string, string>;
}

/**
 * De testgegevens van dit project voor een wegwerpbranch: genoeg om elk scherm met echte rijen te
 * zien en de checkscripts te laten draaien. Verzonnen namen, geen echte personen.
 *
 * Idempotent: alleen upserts, met een vaste sleutel per rij, zodat `pnpm db:seed` herhaald kan
 * draaien zonder duplicaten. Houd de gegevens zelf in een apart bestand (scripts/lib/seed-data.ts)
 * en hier alleen het hoe, zodra het meer dan een handvol rijen wordt.
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export async function seedProject(_db: ScriptDb, _context: SeedContext): Promise<void> {
  /* Nog niets. Het eerste wat hier komt, komt uit het projectplan. */
}
