/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Openstaande migraties toepassen op de database uit je omgeving.
 *
 * Gebruik: pnpm db:migrate
 *
 * Hetzelfde werk als `pnpm db:deploy` en via hetzelfde codepad, maar zonder de advisory lock en
 * zonder de guard op de productiebranch: die twee horen bij een deploy en niet bij een dev-branch
 * waar je zelf achter zit.
 *
 * **Dit verving `drizzle-kit migrate`**, en dat is geen smaakkwestie. Die draait alle openstaande
 * migraties in één transactie, en dan is een nieuwe enumwaarde niet in dezelfde run te gebruiken.
 * Zie de toelichting in scripts/lib/migrate.ts.
 */

import { withDirectDb } from "./lib/connection";
import { applyMigrations } from "./lib/migrate";
import { runScript } from "./lib/run";

runScript(async () => {
  await withDirectDb(async (pool) => {
    const applied = await applyMigrations(pool);
    console.log(applied.length === 0 ? "Niets te migreren, alles staat er al." : `${applied.length} migratie(s) toegepast.`);
  });
});
