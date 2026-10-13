/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De outbox: elk bericht naar een mens, als rij, verstuurd door een ronde en nooit rechtstreeks
 * vanuit een handeling. Zie template/modules/messaging/claude.md.
 *
 * **Waarom dit naast `jobs` staat en niet erin.** Een job is een schrijfactie naar een ander systeem
 * met een verzoek en een antwoord; een bericht heeft een geadresseerde, een onderwerp en een tekst,
 * en wordt gebundeld per ontvanger. Ze delen het idee "later, en precies één keer" en de lease.
 *
 * **De idempotentiesleutel** is de soort plus waar het over gaat plus de ontvanger, bijvoorbeeld
 * `integration_stuck:jobs:2026-10-02:anna@voorbeeld.invalid`. Twee keer dezelfde gebeurtenis is één
 * bericht; de volgende dag mag hij weer.
 *
 * **`kind` is tekst**: de catalogus van soorten staat in code (lib/messaging/kinds.ts en de
 * catalogus van het project) en een nieuwe soort vraagt geen migratie.
 *
 * `notification_settings` is wat een beheerder per soort instelt: aan of uit, naar wie, en een
 * drempel als de soort er een heeft. Geen rij betekent de standaard uit de catalogus.
 */
import { sql } from "drizzle-orm";
import { boolean, check, index, integer, pgEnum, pgTable, primaryKey, smallint, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { primaryKeyColumn, timestamps } from "./columns";
import { organisations } from "./organisations";

export const outboxChannel = pgEnum("outbox_channel", ["mail", "teams"]);
export const outboxStatus = pgEnum("outbox_status", ["pending", "sent", "failed"]);

export const outbox = pgTable(
  "outbox",
  {
    id: primaryKeyColumn(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    idempotencyKey: text("idempotency_key").notNull(),
    kind: text("kind").notNull(),
    channel: outboxChannel("channel").notNull().default("mail"),
    /** Leeg bij een Teams-bericht: dat gaat naar het kanaal en niet naar een persoon. */
    toEmail: text("to_email"),
    subject: text("subject").notNull(),
    bodyMd: text("body_md").notNull(),
    status: outboxStatus("status").notNull().default("pending"),
    attempts: smallint("attempts").notNull().default(0),
    lastError: text("last_error"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    claimedUntil: timestamp("claimed_until", { withTimezone: true }),
    ...timestamps,
  },
  (t) => [
    unique("outbox_idempotency_key").on(t.idempotencyKey),
    index("outbox_pending_idx").on(t.status, t.createdAt),
    check("outbox_mail_has_address", sql`${t.channel} <> 'mail' or ${t.toEmail} is not null`),
  ],
);

export type OutboxRow = typeof outbox.$inferSelect;
export type OutboxChannel = OutboxRow["channel"];
export type OutboxStatus = OutboxRow["status"];

export const notificationSettings = pgTable(
  "notification_settings",
  {
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    kind: text("kind").notNull(),
    enabled: boolean("enabled").notNull().default(true),
    /** `admins`, `person` of `role:<rol>`; de code controleert of de soort die doelgroep toestaat. */
    audience: text("audience").notNull(),
    thresholdValue: integer("threshold_value"),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.organisationId, t.kind] }),
    check("notification_threshold_positive", sql`${t.thresholdValue} is null or ${t.thresholdValue} > 0`),
  ],
);

export type NotificationSettingRow = typeof notificationSettings.$inferSelect;
