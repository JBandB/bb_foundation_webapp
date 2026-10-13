/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Draait de laatst toegepaste migratie terug. Zie CLAUDE.md, Definition of done: elke migratie heeft
 * een up en een down die is uitgevoerd op een dev-branch.
 *
 * Gebruik: pnpm db:down
 *
 * De down-bestanden staan in lib/db/migrations/down/ met exact dezelfde naam als de heenweg.
 * Ontbreekt er een, dan stopt dit script en meldt welke.
 */

import { withDirectDb } from "./lib/connection";
import { countAppliedMigrations, readJournal, rollbackLastMigration } from "./lib/migrate";
import { runScript } from "./lib/run";

runScript(async () => {
  await withDirectDb(async (pool) => {
    const applied = await countAppliedMigrations(pool);
    console.log(`${applied} van ${readJournal().length} migraties toegepast.`);
    const tag = await rollbackLastMigration(pool);
    console.log(tag === undefined ? "Geen toegepaste migraties. Er is niets terug te draaien." : `${tag} is teruggedraaid en uit de migratietabel gehaald.`);
  });
});
