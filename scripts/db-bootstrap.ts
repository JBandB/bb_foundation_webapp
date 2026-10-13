/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Zet neer wat elke omgeving minimaal nodig heeft: de organisatie uit project.config.json en de
 * referentiegegevens van het project (scripts/lib/bootstrap.project.ts). Idempotent, en veilig om op
 * productie te draaien.
 *
 * Gebruik: pnpm db:bootstrap
 *
 * Dit is niet de seed. Er komen geen gebruikers en geen testgegevens uit dit script. Zonder de
 * organisatierij faalt de eerste login, want de gebruiker kan dan aan geen organisatie hangen.
 */

import { withDirectDb } from "./lib/connection";
import { ensureBaseData } from "./lib/bootstrap";
import { runScript } from "./lib/run";
import { scriptDb } from "./lib/connection";

runScript(async () => {
  await withDirectDb(async (pool) => {
    await ensureBaseData(scriptDb(pool));
    console.log("\nBootstrap klaar. Herhaald uitvoeren is veilig.");
  });
});
