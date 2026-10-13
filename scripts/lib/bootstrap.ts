/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wat elke omgeving nodig heeft om te kunnen functioneren, en niets meer: de organisatie, met de naam,
 * de valuta en de tijdzone uit project.config.json. Daarna krijgt het project het woord via
 * `bootstrapProject` in scripts/lib/bootstrap.project.ts, voor zijn eigen referentiegegevens.
 *
 * Gedeeld door db-bootstrap (overal veilig, ook op productie) en db-seed (alleen op een
 * wegwerpbranch). Dat onderscheid is geen formaliteit: zonder organisatierij kan niemand inloggen,
 * maar verzonnen gebruikers en testgegevens horen nergens anders dan op een dev-branch.
 *
 * Geen transactie: elk statement is een upsert, dus een halve run repareer je door hem opnieuw te
 * draaien.
 */

import { eq, sql } from "drizzle-orm";
import { organisations } from "../../lib/db/schema";
import { PROJECT } from "../../lib/project/config.generated";
import { bootstrapProject } from "./bootstrap.project";
import type { ScriptDb } from "./connection";

/** Zet de organisatie neer of werkt hem bij, en geeft zijn id terug. */
export async function ensureOrganisation(db: ScriptDb): Promise<string> {
  const existing = (await db.select({ id: organisations.id }).from(organisations).limit(1))[0];
  if (existing !== undefined) {
    await db
      .update(organisations)
      .set({ name: PROJECT.organisationName, baseCurrency: PROJECT.currency, timezone: PROJECT.timezone, updatedAt: sql`now()` })
      .where(eq(organisations.id, existing.id));
    console.log(`  organisatie   ${PROJECT.organisationName} (bijgewerkt)`);
    return existing.id;
  }

  const inserted = (
    await db
      .insert(organisations)
      .values({ name: PROJECT.organisationName, baseCurrency: PROJECT.currency, timezone: PROJECT.timezone })
      .returning({ id: organisations.id })
  )[0];
  if (inserted === undefined) throw new Error("De organisatie kon niet worden aangemaakt.");
  console.log(`  organisatie   ${PROJECT.organisationName} (aangemaakt)`);
  return inserted.id;
}

/** De organisatie plus wat het project zelf nodig heeft. */
export async function ensureBaseData(db: ScriptDb): Promise<string> {
  const organisationId = await ensureOrganisation(db);
  await bootstrapProject(db, organisationId);
  return organisationId;
}
