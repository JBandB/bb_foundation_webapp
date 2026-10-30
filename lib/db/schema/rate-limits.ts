/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Tellers voor alles wat van buiten te raken is: een inlogpoging, een hulpformulier, een melding.
 *
 * **Waarom in de database en niet in het geheugen.** Vercel draait elke aanroep mogelijk op een
 * andere functie-instantie, dus een teller in het geheugen telt per instantie en beschermt niets.
 * Een externe store (Upstash, Redis) is een afhankelijkheid en een abonnement voor een teller. De
 * database is er al, één upsert per poging is niets op deze volumes, en de rijen ruimen zichzelf op
 * via de dagelijkse opruimtaak.
 *
 * **De sleutel draagt waar hij over gaat**: `login:<adres>` of `feedback:<gebruiker>`. Geen aparte
 * kolommen voor soort en wie, want deze tabel heeft één lezer die de sleutel zelf bouwt. Dit is een
 * slot en geen administratie: er wordt niet op gerapporteerd.
 */

import { index, integer, pgTable, primaryKey, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { appRowAccess } from "./rls";

export const rateLimits = pgTable(
  "rate_limits",
  {
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    key: text("key").notNull(),
    windowStart: timestamp("window_start", { withTimezone: true }).notNull(),
    count: integer("count").notNull().default(0),
  },
  (t) => [
    primaryKey({ columns: [t.key, t.windowStart] }),
    /** Voor het opruimen: alles ouder dan gisteren mag weg. */
    index("rate_limits_window_idx").on(t.windowStart),
    appRowAccess(),
  ],
);
