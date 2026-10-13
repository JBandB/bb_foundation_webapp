/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Idempotente seed voor een wegwerpbranch. Herhaald uitvoeren is veilig.
 *
 * Gebruik: pnpm db:seed, met SEED_TARGET in .env.local op het endpoint van je dev-branch.
 *
 * Wat het doet, in volgorde: de organisatie en de referentiegegevens (als db:bootstrap), de
 * dev-accounts uit project.config.json als gebruikers, en daarna de testgegevens van het project uit
 * scripts/lib/seed.project.ts.
 */

import { sql } from "drizzle-orm";
import { users } from "../lib/db/schema";
import { initialsOf } from "../lib/domain/initials";
import { PROJECT } from "../lib/project/config.generated";
import { ensureBaseData } from "./lib/bootstrap";
import { describeTarget, directUrl, scriptDb, withDirectDb, type ScriptDb } from "./lib/connection";
import { runScript } from "./lib/run";
import { seedProject } from "./lib/seed.project";
import { assertConfirmedTarget } from "./lib/seed-guard";

/** Zet een dev-account neer of werkt het bij, en geeft zijn id terug. */
async function upsertDevUser(db: ScriptDb, organisationId: string, email: string, displayName: string, roles: readonly string[]): Promise<string> {
  const row = (
    await db
      .insert(users)
      .values({
        organisationId,
        externalId: `dev:${email}`,
        email,
        displayName,
        initials: initialsOf(displayName),
        roles: [...roles],
      })
      .onConflictDoUpdate({
        target: users.externalId,
        set: { displayName, initials: initialsOf(displayName), roles: [...roles], isActive: true, deletedAt: null, updatedAt: sql`now()` },
      })
      .returning({ id: users.id })
  )[0];
  if (row === undefined) throw new Error(`Dev-account ${email} kon niet worden neergezet.`);
  console.log(`  dev-account   ${email} (${roles.join(", ")})`);
  return row.id;
}

runScript(async () => {
  assertConfirmedTarget(describeTarget(directUrl()), "De seed");

  await withDirectDb(async (pool) => {
    const db = scriptDb(pool);
    const organisationId = await ensureBaseData(db);

    const userIdsByEmail = new Map<string, string>();
    for (const dev of PROJECT.devUsers) {
      userIdsByEmail.set(dev.email, await upsertDevUser(db, organisationId, dev.email, dev.displayName, dev.roles));
    }

    await seedProject(db, { organisationId, userIdsByEmail });
    console.log("\nSeed klaar. Herhaald uitvoeren is veilig.");
  });
});
