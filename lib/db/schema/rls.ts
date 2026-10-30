/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Row Level Security op elke tabel, met één regel: de rol van de app mag alle rijen. Zie CLAUDE.md
 * regel 16 en besluit D13.
 *
 * ---
 *
 * **Waarom een slot zonder filter.** In een eerder project bleek op productie dat het aanzetten van
 * de Data API van de databasedienst Row Level Security op bijna elke tabel had gezet, zonder één
 * regel. De eigenaar van de tabellen merkt daar niets van (een eigenaar gaat altijd langs het slot),
 * maar zodra de app als zijn eigen rol verbond, zag die nul rijen en viel het inloggen om. Met het
 * slot op elke tabel en precies één regel ziet elke andere rol niets: een rol die er later bij komt,
 * een Data API die weer aangaat, of een gelekte verbinding zonder de rol van de app.
 *
 * **Wat het niet is.** Geen filter per organisatie of per klant: wie wat mag binnen de app, regelt de
 * app zelf (CLAUDE.md regel 2 en 11), en met één organisatie zou een tenantfilter niets toevoegen.
 * De regel is `using (true)` voor precies één rol.
 *
 * **Elke tabel draagt hem**, via `appRowAccess()` in het blok met indexen van `pgTable`. Drizzle zet
 * bij een tabel met een regel zelf `ENABLE ROW LEVEL SECURITY` en `CREATE POLICY` in de gegenereerde
 * migratie, dus je schrijft geen SQL met de hand. `rls.test.ts` faalt zodra een tabel de regel mist,
 * want een tabel zonder regel is voor de app leeg, en dat merkt geen test die als eigenaar draait.
 *
 * **De rol komt uit dit bestand.** `appRole` is een rol die drizzle beheert (`entities.roles` in
 * `drizzle.config.ts`): de gegenereerde migratie maakt hem aan vóór de regels die naar hem verwijzen.
 * Wat hij mag (lezen en schrijven, geen DDL, de audit log alleen aanvullen) staat in de custom
 * migratie van schemaversie 2 van core, en `pnpm check:grants` bewijst het.
 */

import { sql } from "drizzle-orm";
import { pgPolicy, pgRole } from "drizzle-orm/pg-core";

/** De rol waarmee de app verbindt. Zonder login: een inlogrol per omgeving wordt er lid van. */
export const appRole = pgRole("app_rw");

/** De naam van de regel op elke tabel, zoals `pg_policies` hem toont. */
export const APP_ROW_POLICY = "app_rw_all";

/** De ene regel op elke tabel: de rol van de app leest en schrijft alle rijen. */
export function appRowAccess() {
  return pgPolicy(APP_ROW_POLICY, {
    as: "permissive",
    for: "all",
    to: appRole,
    using: sql`true`,
    withCheck: sql`true`,
  });
}
