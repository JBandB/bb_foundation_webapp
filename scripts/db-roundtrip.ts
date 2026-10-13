/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het bewijs dat een migratie heen én terug werkt: migreren, terugdraaien, opnieuw migreren.
 *
 * Gebruik: pnpm db:roundtrip, op je dev-branch (SEED_TARGET), nooit op productie.
 *
 * Wat er gebeurt: eerst alles toepassen wat openstaat. Daarna evenveel migraties terugdraaien als er
 * zojuist zijn toegepast (of één, als er niets openstond, zodat de laatste terugweg toch getest is),
 * en dan weer vooruit tot de stand van de code. Elke stap meldt zich; faalt er een, dan staat de
 * database op de laatste geslaagde stap en zegt de fout welk statement het was.
 *
 * Dit is wat de Definition of done bedoelt met "een down die is uitgevoerd": niet geschreven, maar
 * gedraaid.
 */

import { describeTarget, directUrl, withDirectDb } from "./lib/connection";
import { applyMigrations, countAppliedMigrations, readJournal, rollbackLastMigration } from "./lib/migrate";
import { runScript } from "./lib/run";
import { assertConfirmedTarget } from "./lib/seed-guard";

runScript(async () => {
  assertConfirmedTarget(describeTarget(directUrl()), "De rondgang (db:roundtrip)");

  await withDirectDb(async (pool) => {
    const known = readJournal().length;

    console.log("\n1. Vooruit");
    const applied = await applyMigrations(pool);
    console.log(applied.length === 0 ? "  niets openstaand" : `  ${applied.length} toegepast`);

    const steps = Math.max(1, applied.length);
    console.log(`\n2. Terug, ${steps} stap${steps === 1 ? "" : "pen"}`);
    for (let step = 0; step < steps; step += 1) {
      const tag = await rollbackLastMigration(pool);
      if (tag === undefined) {
        console.log("  niets meer terug te draaien");
        break;
      }
    }

    console.log("\n3. Weer vooruit");
    const reapplied = await applyMigrations(pool);
    console.log(`  ${reapplied.length} toegepast`);

    const count = await countAppliedMigrations(pool);
    if (count !== known) {
      throw new Error(`Na de rondgang staan er ${count} migraties, de code kent er ${known}. Dat hoort gelijk te zijn.`);
    }
    console.log(`\nRondgang geslaagd: ${known} migraties, elk met een werkende terugweg voor wat vandaag is getest.`);
  });
});
