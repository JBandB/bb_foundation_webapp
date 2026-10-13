/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Gebruikers: wie er is ingelogd, met naam en rollen.
 *
 * Bij de Entra-module ontstaat een rij doordat iemand voor het eerst inlogt, en verdwijnt hij niet als
 * iemand uit Entra gaat: wat hij heeft gedaan moet herleidbaar blijven. Bij de wachtwoordmodule maakt
 * een beheerder de rij aan met een uitnodiging. In beide gevallen is deze tabel geen eigen
 * identiteitsbeheer: wachtwoorden en tweestapsverificatie staan in een eigen tabel van die module.
 */

import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, unique, uniqueIndex, uuid } from "drizzle-orm/pg-core";
import { primaryKeyColumn, softDelete, timestamps } from "./columns";
import { organisations } from "./organisations";

export const users = pgTable(
  "users",
  {
    id: primaryKeyColumn(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),

    /**
     * Wie dit is bij de inlogmodule. Bij Entra de object-id (`oid`) uit het profiel, bij de
     * wachtwoordlogin `local:<uuid>`, bij een dev-account `dev:<adres>`. Het `user.id` van Auth.js
     * staat hier nooit in: dat is per login een willekeurige UUID.
     */
    externalId: text("external_id").notNull(),

    email: text("email").notNull(),
    displayName: text("display_name").notNull(),

    /** Voor de avatar in de rail. Afgeleid uit de naam, niet ingevoerd. */
    initials: text("initials").notNull(),

    /**
     * De rollen, als waarden uit project.config.json.
     *
     * Bij Entra is dit een CACHE van de roles-claim, bijgewerkt bij elke login en alleen gelezen
     * voor overzichten; autorisatie leest altijd het token. Bij de wachtwoordlogin is dit de BRON,
     * beheerd op Beheer, Toegang, en ververst `currentActor` hem bij elk verzoek. Zie CLAUDE.md regel 1.
     */
    roles: text("roles")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),

    /** Wie niet actief is kan niet inloggen, maar blijft bestaan voor de historie. */
    isActive: boolean("is_active").notNull().default(true),

    ...timestamps,
    ...softDelete,
  },
  (t) => [
    unique("users_external_id_key").on(t.externalId),

    /**
     * Eén rij per persoon, ongeacht hoofdlettergebruik in het e-mailadres.
     *
     * Dit is geen nette-database-hygiëne maar een voorwaarde: de synchronisatie bij het inloggen
     * valt terug op het e-mailadres om een bestaande rij te herkennen, en die stap is alleen
     * eenduidig als een adres bij precies één rij hoort.
     */
    uniqueIndex("users_organisation_email_key").on(t.organisationId, sql`lower(${t.email})`),

    index("users_organisation_idx").on(t.organisationId),
  ],
);

export type User = typeof users.$inferSelect;
