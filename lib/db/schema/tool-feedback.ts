/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Feedback op de tool zelf, van een ingelogde gebruiker.
 *
 * **De rij is het bewijs dat iemand iets heeft gemeld.** Wat er daarna mee gebeurt (een mail aan de
 * beheerder, een taak in een extern systeem) loopt via de wachtrij van de module jobs of messaging en
 * staat dus los van deze rij: faalt het versturen, dan is de melding zelf niet weg.
 *
 * Een schermafbeelding of de HTML van de pagina staat hier niet in. Dat zou elke melding tientallen
 * kilobytes ruis in de database zetten voor een kopie die niemand leest; wie een bijlage wil, heeft
 * daar de module files voor.
 */

import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { primaryKeyColumn, timestamps } from "./columns";
import { organisations } from "./organisations";
import { users } from "./users";

export const toolFeedback = pgTable(
  "tool_feedback",
  {
    id: primaryKeyColumn(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),

    /** Wie het meldde: de ingelogde gebruiker, geen opgegeven naam. */
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),

    title: text("title").notNull(),
    body: text("body").notNull(),

    /** Waar het vandaan komt: het pad in de applicatie, zoals `/admin/access`. */
    pagePath: text("page_path").notNull(),

    ...timestamps,
  },
  (t) => [index("tool_feedback_user_idx").on(t.userId, t.createdAt)],
);

export type ToolFeedback = typeof toolFeedback.$inferSelect;
