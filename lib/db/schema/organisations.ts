/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De organisatie. Er is precies één rij, afgedwongen door de unieke index `one_organisation` uit de
 * tweede migratie.
 *
 * De tool is multi-tenant-ready, niet multi-tenant: elke tabel met domeinbetekenis heeft een
 * `organisation_id` en de data-access laag geeft die verplicht mee (CLAUDE.md regel 2), maar er komt
 * geen tweede rij tenzij het project ooit als product aan meerdere organisaties verkocht wordt. Later
 * omzetten kost dagen, nu bouwen kost weken zonder opbrengst.
 *
 * De naam, de valuta en de tijdzone komen uit project.config.json en worden door `pnpm db:bootstrap`
 * neergezet. Eigen instellingen van de organisatie krijgen hier een kolom bij in het project; een
 * kolom die door niets gelezen wordt hoort er niet in, want iemand verzet hem en denkt dat er iets
 * gebeurt.
 */

import { char, pgTable, text } from "drizzle-orm/pg-core";
import { primaryKeyColumn, timestamps } from "./columns";

export const organisations = pgTable("organisations", {
  id: primaryKeyColumn(),
  name: text("name").notNull(),

  /** De standaardvaluta (ISO 4217), alleen van belang als het project met geld rekent. */
  baseCurrency: char("base_currency", { length: 3 }).notNull().default("EUR"),

  /**
   * De tijdzone waarin datums uit tijdstippen worden afgeleid. Staat in de database en niet alleen
   * in code, zodat een query hem kan gebruiken; de code leest dezelfde waarde uit PROJECT.
   */
  timezone: text("timezone").notNull().default("Europe/Amsterdam"),

  ...timestamps,
});

export type Organisation = typeof organisations.$inferSelect;
