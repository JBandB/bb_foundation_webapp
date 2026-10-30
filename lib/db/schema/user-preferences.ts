/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wat iemand voor zichzelf heeft ingesteld.
 *
 * **Waarom dit niet in de browser staat.** CLAUDE.md regel 4 verbiedt domeindata in `localStorage`,
 * en een voorkeur is een grensgeval: er staat niets gevoeligs in. Toch hoort hij hier, om een
 * praktische reden: wie op zijn laptop donker kiest, bedoelt dat ook op zijn telefoon. Een voorkeur
 * die per apparaat anders is, is geen voorkeur maar een verrassing.
 *
 * **Eigen tabel en geen kolommen op `users`.** Die rij wordt bij elke login bijgewerkt vanuit de
 * inlogmodule. Een voorkeur hoort niet in het bereik van een synchronisatie met een systeem dat er
 * niets van weet: één vergeten kolom in een `onConflictDoUpdate` en de instelling is weg.
 *
 * **Getypeerde kolommen en geen sleutel-waardetabel.** Een `key text, value text` kost nooit een
 * migratie, en precies daarom wordt het een la waar alles in verdwijnt. Een kolom per voorkeur is te
 * lezen, te controleren en te verwijderen. Het project zet er zijn eigen voorkeuren als kolommen bij.
 *
 * **Eén rij per gebruiker, aangemaakt bij de eerste wijziging.** Wie niets heeft ingesteld heeft
 * geen rij, en dan gelden de standaarden.
 */

import { sql } from "drizzle-orm";
import { check, pgTable, text, uuid } from "drizzle-orm/pg-core";
import { timestamps } from "./columns";
import { organisations } from "./organisations";
import { appRowAccess } from "./rls";
import { users } from "./users";

export const userPreferences = pgTable(
  "user_preferences",
  {
    /** De gebruiker zelf is de sleutel: er is precies één rij per persoon. */
    userId: uuid("user_id")
      .primaryKey()
      .references(() => users.id),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),

    /**
     * `light` of `dark`. De modus waarin de applicatie opent.
     *
     * Licht is de standaard. De waarde hier is de bron van waarheid; hij wordt bij het inloggen en
     * bij elke wijziging naar een cookie gespiegeld zodat de server de class op <html> kan zetten
     * zonder eerst de database te bevragen.
     */
    theme: text("theme").notNull().default("light"),

    ...timestamps,
  },
  (t) => [
    /* De toegestane waarden staan in de database en niet alleen in de code, want deze kolom wordt uit een formulierwaarde gevuld. */
    check("theme_known", sql`${t.theme} in ('light', 'dark')`),
    appRowAccess(),
  ],
);

export type UserPreferences = typeof userPreferences.$inferSelect;
