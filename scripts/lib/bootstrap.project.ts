import type { ScriptDb } from "./connection";

/**
 * De referentiegegevens van dit project die op **elke** omgeving horen te staan, ook op productie:
 * een catalogus, een vaste lijst soorten, een standaardinstelling. Geen gebruikers en geen
 * testgegevens, die horen in seed.project.ts.
 *
 * Idempotent: alleen upserts (`onConflictDoUpdate`), zodat herhaald draaien veilig is. Wordt
 * aangeroepen door `pnpm db:bootstrap` en door `pnpm db:seed`.
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export async function bootstrapProject(_db: ScriptDb, _organisationId: string): Promise<void> {
  /* Nog niets. Het eerste wat hier komt, komt uit het projectplan. */
}
