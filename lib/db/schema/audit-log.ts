/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De audit log. Zie CLAUDE.md regel 5.
 *
 * **Append-only, en dat wordt afgedwongen door een trigger.** Niet door een afspraak, niet door een
 * code review, en niet alleen door `REVOKE`. Zie de tweede migratie.
 *
 * Waarom een trigger en niet alleen rechten intrekken: op Neon verbindt de applicatie als de eigenaar
 * van de tabel, en een eigenaar mag zichzelf rechten teruggeven. `REVOKE UPDATE, DELETE` is daar dus
 * een aantekening en geen slot. Een `before`-trigger die gooit werkt ongeacht de rol, en is te testen
 * vanaf dezelfde verbinding als waarmee de applicatie draait (`pnpm check:core`).
 *
 * `bigserial` en geen uuid, anders dan elke andere tabel hier. Een logtabel wordt sequentieel
 * geschreven en op volgorde gelezen, en dan is een oplopend getal zowel kleiner als sneller. Er
 * verwijst ook niets naar deze rijen.
 */

import { bigserial, index, inet, jsonb, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { organisations } from "./organisations";
import { appRowAccess } from "./rls";

export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "bigint" }).primaryKey(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),

    /**
     * De gebruiker mag leeg zijn, het e-mailadres niet.
     *
     * Een cron of een migratie handelt zonder ingelogde gebruiker, en dan is er geen `user_id`. Het
     * adres is er altijd, desnoods het systeemadres uit project.config.json, zodat elke regel te
     * herleiden is tot iets.
     *
     * **Met opzet geen foreign key naar `users`.** Een logregel hoort te overleven wat hij
     * beschrijft: gaat er ooit een gebruikersrij weg, dan mag dat de log van vorig jaar niet
     * blokkeren of meeslepen. Daarom staat het e-mailadres er als tekst naast en niet alleen de
     * verwijzing. De prijs is dat een verkeerde id hier niet wordt tegengehouden.
     */
    actorUserId: uuid("actor_user_id"),
    actorEmail: text("actor_email").notNull(),

    entityTable: text("entity_table").notNull(),
    entityId: uuid("entity_id").notNull(),
    /** insert, update, delete, restore, en wat het project eraan toevoegt in lib/db/audit-actions.ts. */
    action: text("action").notNull(),

    before: jsonb("before"),
    after: jsonb("after"),

    /** Waarvandaan, als de handeling uit een verzoek komt. Een cron laat ze leeg. */
    ip: inet("ip"),
    userAgent: text("user_agent"),

    changedAt: timestamp("changed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    /** "Wat is er met deze rij gebeurd", de meest gestelde vraag. */
    index("audit_log_entity_idx").on(t.entityTable, t.entityId, t.changedAt),
    index("audit_log_actor_idx").on(t.actorUserId, t.changedAt),
    appRowAccess(),
  ],
);

export type AuditLogRow = typeof auditLog.$inferSelect;
