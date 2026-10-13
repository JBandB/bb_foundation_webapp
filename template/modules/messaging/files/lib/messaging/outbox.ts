/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De outbox in de database: berichten erin zetten, opeisen voor een verzendronde, de stand omzetten
 * en opruimen. Versturen zelf doet lib/messaging/send.ts.
 */
import { and, eq, lt, sql } from "drizzle-orm";
import type { DbOrTransaction } from "@/lib/db/client";
import { rowsOf } from "@/lib/db/rows";
import { outbox, type OutboxChannel } from "@/lib/db/schema";
import { claimRows } from "@/lib/jobs/lease";
import { shorten } from "@/lib/jobs/queue";

/** Na drie mislukte pogingen blijft een bericht op mislukt staan tot iemand het opnieuw aanbiedt. */
export const MAX_MAIL_ATTEMPTS = 3;

/** Verstuurde berichten blijven zo lang leesbaar in het logboek. */
export const OUTBOX_KEEP_DAYS = 90;

export interface OutboxMessage {
  /** De soort plus waar het over gaat plus de ontvanger. Nooit iets dat per aanroep verandert. */
  readonly idempotencyKey: string;
  readonly kind: string;
  readonly channel?: OutboxChannel;
  readonly toEmail?: string;
  readonly subject: string;
  readonly bodyMd: string;
}

/** Zet berichten in de rij; wat er al stond (zelfde sleutel) wordt overgeslagen. Geeft terug hoeveel er nieuw zijn. */
export async function enqueueMessages(db: DbOrTransaction, organisationId: string, messages: readonly OutboxMessage[]): Promise<number> {
  if (messages.length === 0) return 0;
  const inserted = await db
    .insert(outbox)
    .values(
      messages.map((message) => ({
        organisationId,
        idempotencyKey: message.idempotencyKey,
        kind: message.kind,
        channel: message.channel ?? "mail",
        toEmail: message.toEmail ?? null,
        subject: message.subject,
        bodyMd: message.bodyMd,
      })),
    )
    .onConflictDoNothing({ target: outbox.idempotencyKey })
    .returning({ id: outbox.id });
  return inserted.length;
}

export interface ClaimedMessage {
  readonly id: string;
  readonly channel: OutboxChannel;
  readonly toEmail: string | null;
  readonly subject: string;
  readonly bodyMd: string;
  readonly attempts: number;
}

interface Row {
  id: string;
  channel: OutboxChannel;
  to_email: string | null;
  subject: string;
  body_md: string;
  attempts: number | string;
  created_at: string | Date;
}

/** Berichten opeisen voor deze ronde, alleen voor de kanalen die ingericht zijn. Dezelfde lease als de wachtrij. */
export async function claimPending(db: DbOrTransaction, organisationId: string, channels: readonly OutboxChannel[], limit: number): Promise<ClaimedMessage[]> {
  if (channels.length === 0) return [];
  const rows = await claimRows<Row>(db, {
    table: "outbox",
    statuses: ["pending"],
    columns: ["id", "channel", "to_email", "subject", "body_md", "attempts"],
    limit,
    where: sql`and organisation_id = ${organisationId} and channel::text in (${sql.join(
      channels.map((channel) => sql`${channel}`),
      sql`, `,
    )})`,
  });
  return rows.map((row) => ({ id: row.id, channel: row.channel, toEmail: row.to_email, subject: row.subject, bodyMd: row.body_md, attempts: Number(row.attempts) }));
}

export async function markSent(db: DbOrTransaction, id: string): Promise<void> {
  await db.update(outbox).set({ status: "sent", sentAt: sql`now()`, claimedUntil: null, lastError: null, updatedAt: sql`now()` }).where(eq(outbox.id, id));
}

export async function markFailed(db: DbOrTransaction, id: string, attemptsSoFar: number, error: string): Promise<"retry" | "failed"> {
  const attempts = attemptsSoFar + 1;
  const final = attempts >= MAX_MAIL_ATTEMPTS;
  await db
    .update(outbox)
    .set({ status: final ? "failed" : "pending", attempts, lastError: shorten(error), claimedUntil: null, updatedAt: sql`now()` })
    .where(eq(outbox.id, id));
  return final ? "failed" : "retry";
}

/** Hoeveel berichten er in totaal wachten, ook voor een kanaal dat uit staat. Voor de melding. */
export async function countPending(db: DbOrTransaction, organisationId: string): Promise<number> {
  const result = await db.execute(sql`select count(*)::int as n from outbox where organisation_id = ${organisationId} and status = 'pending'`);
  return Number(rowsOf<{ n: number }>(result)[0]?.n ?? 0);
}

export async function pruneOutbox(db: DbOrTransaction, now: Date = new Date(), keepDays: number = OUTBOX_KEEP_DAYS): Promise<number> {
  const limit = new Date(now.getTime() - keepDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .delete(outbox)
    .where(and(eq(outbox.status, "sent"), lt(outbox.sentAt, limit)))
    .returning({ id: outbox.id });
  return rows.length;
}
