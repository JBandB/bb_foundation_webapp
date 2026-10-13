/**
 * Het beginpunt voor een eigen checkscript: kopieer dit bestand naar scripts/check-<domein>.ts, zet
 * `"check:<domein>"` in package.json en schrijf per sectie de beweringen uit het projectplan.
 *
 * Gebruik: pnpm check:example
 *
 * Een checkscript bewijst wat een unittest niet kan: gedrag dat in de database zit of pas klopt met
 * echte rijen eromheen. Lees scripts/lib/check.ts voor het gereedschap en scripts/check-core.ts voor
 * een volledig voorbeeld. Alles wat schrijft, schrijft in een transactie die wordt teruggedraaid.
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */

import { organisations } from "../lib/db/schema";
import { eq } from "drizzle-orm";
import { createChecker, inRollback, requireContext } from "./lib/check";
import { scriptDb, withDirectDb } from "./lib/connection";
import { runScript } from "./lib/run";

runScript(async () => {
  await withDirectDb(async (pool) => {
    const db = scriptDb(pool);
    const ctx = await requireContext(db);
    const t = createChecker();

    t.section("1. De organisatie staat er zoals de configuratie zegt");
    const organisation = (await db.select({ name: organisations.name }).from(organisations).where(eq(organisations.id, ctx.organisationId)))[0];
    t.check("de naam komt uit project.config.json", organisation?.name, ctx.organisationName);

    t.section("2. Een schrijfactie in een transactie die wordt teruggedraaid");
    await inRollback(db, async (tx) => {
      await tx.update(organisations).set({ name: "Tijdelijk" }).where(eq(organisations.id, ctx.organisationId));
      const changed = (await tx.select({ name: organisations.name }).from(organisations).where(eq(organisations.id, ctx.organisationId)))[0];
      t.check("binnen de transactie is de wijziging zichtbaar", changed?.name, "Tijdelijk");
    });
    const after = (await db.select({ name: organisations.name }).from(organisations).where(eq(organisations.id, ctx.organisationId)))[0];
    t.check("en erna is alles zoals het was", after?.name, ctx.organisationName);

    t.summary("Voorbeeld");
  });
});
