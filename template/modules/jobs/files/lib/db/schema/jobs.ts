/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Elke schrijfactie naar buiten, met een idempotentiesleutel en een lease. Zie CLAUDE.md, regel 6
 * van het template, en de uitleg in template/modules/jobs/claude.md.
 *
 * **De idempotentiesleutel is onze eigen id plus wat we willen bereiken**, bijvoorbeeld
 * `crm:create_contact:<personId>`. Uniek, dus twee keer inzetten levert één rij op en twee keer
 * afleveren nooit twee contacten. De garantie zit in de database en niet in de code die aflevert.
 *
 * **`system` is tekst en geen enum**, zodat een project een systeem toevoegt zonder migratie.
 * **`entity_id` is tekst**, want hij wijst naar wisselende tabellen en er wordt alleen op gezocht.
 *
 * **`request` en `response` staan er als jsonb**, niet om op te rekenen maar om achteraf te zien wat
 * de deur uit ging en wat terugkwam. Bij een koppeling die alleen aanmaakt is dat het enige spoor.
 *
 * **`claimed_until` is de lease.** Een ronde eist rijen op met `for update skip locked` en houdt ze
 * vijf minuten vast; `done`, `waiting` en `failed` maken de lease weer leeg. Valt een ronde om, dan
 * komt de rij vanzelf terug. Zie lib/jobs/lease.ts.
 */
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, unique, uuid } from "drizzle-orm/pg-core";
import { primaryKeyColumn, timestamps } from "./columns";
import { organisations } from "./organisations";
import { appRowAccess } from "./rls";

export const jobStatus = pgEnum("job_status", ["pending", "waiting", "done", "failed"]);

export const jobs = pgTable(
  "jobs",
  {
    id: primaryKeyColumn(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),

    /** Het systeem buiten, zoals `crm` of `mail`. De handler staat in lib/jobs/handlers.ts onder `<system>:<operation>`. */
    system: text("system").notNull(),
    operation: text("operation").notNull(),

    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),

    idempotencyKey: text("idempotency_key").notNull(),

    request: jsonb("request"),
    response: jsonb("response"),

    status: jobStatus("status").notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    lastError: text("last_error"),
    /** Waar dit werk op wacht, zoals een ouder die er nog niet is. Leeg als het gewoon aan de beurt is. */
    waitingFor: text("waiting_for"),
    claimedUntil: timestamp("claimed_until", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),

    ...timestamps,
  },
  (t) => [
    unique("jobs_idempotency_key").on(t.idempotencyKey),
    /** Wat een ronde oppakt: alles wat nog niet klaar is, oudste eerst. */
    index("jobs_pending_idx").on(t.status, t.createdAt),
    index("jobs_entity_idx").on(t.entityType, t.entityId),
    appRowAccess(),
  ],
);

export type Job = typeof jobs.$inferSelect;
export type JobStatus = Job["status"];
