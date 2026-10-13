/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het logboek van de outbox voor Beheer, Berichten: wat er de deur uit ging, wat wacht en wat
 * mislukte, en de knop om een mislukt bericht opnieuw aan te bieden. Alles achter `admin:messages`.
 */
import { and, count, desc, eq, sql } from "drizzle-orm";
import type { Actor } from "@/lib/auth/actor";
import { assertCan } from "@/lib/auth/can";
import { appendAuditLog } from "@/lib/db/audit";
import type { DbOrTransaction } from "@/lib/db/client";
import { outbox, type OutboxChannel, type OutboxStatus } from "@/lib/db/schema";
import { shorten } from "@/lib/jobs/queue";

export const MESSAGE_STATUSES: readonly OutboxStatus[] = ["pending", "sent", "failed"];
export const MAX_LOG_ROWS = 200;

export interface MessageFilter {
  readonly kind?: string | undefined;
  readonly status?: OutboxStatus | undefined;
}

export interface MessageRow {
  readonly id: string;
  readonly kind: string;
  readonly channel: OutboxChannel;
  readonly toEmail: string | null;
  readonly subject: string;
  readonly bodyMd: string;
  readonly status: OutboxStatus;
  readonly attempts: number;
  readonly lastError: string | null;
  readonly createdAt: Date;
  readonly sentAt: Date | null;
}

export interface MessageLog {
  readonly rows: readonly MessageRow[];
  /** Het aantal dat aan het filter voldoet, ook voorbij de tweehonderd. */
  readonly matching: number;
  readonly pending: number;
  readonly sent: number;
  readonly failed: number;
}

export function toMessageStatus(raw: string | undefined): OutboxStatus | undefined {
  return MESSAGE_STATUSES.find((status) => status === raw);
}

export async function loadMessageLog(db: DbOrTransaction, actor: Actor, filter: MessageFilter = {}): Promise<MessageLog> {
  assertCan(actor, "admin:messages");
  const conditions = [eq(outbox.organisationId, actor.organisationId)];
  if (filter.kind !== undefined) conditions.push(eq(outbox.kind, filter.kind));
  if (filter.status !== undefined) conditions.push(eq(outbox.status, filter.status));
  const where = and(...conditions);

  const rows = await db
    .select({
      id: outbox.id,
      kind: outbox.kind,
      channel: outbox.channel,
      toEmail: outbox.toEmail,
      subject: outbox.subject,
      bodyMd: outbox.bodyMd,
      status: outbox.status,
      attempts: outbox.attempts,
      lastError: outbox.lastError,
      createdAt: outbox.createdAt,
      sentAt: outbox.sentAt,
    })
    .from(outbox)
    .where(where)
    .orderBy(desc(outbox.createdAt))
    .limit(MAX_LOG_ROWS);

  const matching = (await db.select({ n: count() }).from(outbox).where(where))[0];
  const totals = (
    await db
      .select({
        pending: count(sql`case when ${outbox.status} = 'pending' then 1 end`),
        sent: count(sql`case when ${outbox.status} = 'sent' then 1 end`),
        failed: count(sql`case when ${outbox.status} = 'failed' then 1 end`),
      })
      .from(outbox)
      .where(eq(outbox.organisationId, actor.organisationId))
  )[0];

  return {
    rows: rows.map((row) => ({ ...row, attempts: Number(row.attempts), lastError: row.lastError === null ? null : shorten(row.lastError) })),
    matching: Number(matching?.n ?? 0),
    pending: Number(totals?.pending ?? 0),
    sent: Number(totals?.sent ?? 0),
    failed: Number(totals?.failed ?? 0),
  };
}

/** De soorten die ooit verstuurd zijn, voor het filter. */
export async function listUsedKinds(db: DbOrTransaction, actor: Actor): Promise<string[]> {
  assertCan(actor, "admin:messages");
  const rows = await db.selectDistinct({ kind: outbox.kind }).from(outbox).where(eq(outbox.organisationId, actor.organisationId)).orderBy(outbox.kind);
  return rows.map((row) => row.kind);
}

export type RetryOutcome = "done" | "notFound" | "notFailed";

export async function retryMessage(db: DbOrTransaction, actor: Actor, id: string): Promise<RetryOutcome> {
  assertCan(actor, "admin:messages");
  const existing = (
    await db
      .select({ status: outbox.status, attempts: outbox.attempts })
      .from(outbox)
      .where(and(eq(outbox.id, id), eq(outbox.organisationId, actor.organisationId)))
      .limit(1)
  )[0];
  if (existing === undefined) return "notFound";
  if (existing.status !== "failed") return "notFailed";

  await db
    .update(outbox)
    .set({ status: "pending", attempts: 0, lastError: null, claimedUntil: null, updatedAt: sql`now()` })
    .where(and(eq(outbox.id, id), eq(outbox.organisationId, actor.organisationId)));
  await appendAuditLog(db, actor, { entityTable: "outbox", entityId: id, action: "update", before: { status: "failed", attempts: Number(existing.attempts) }, after: { status: "pending", attempts: 0 } });
  return "done";
}
