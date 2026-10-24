/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het verbruik: één regel per verzoek in `ai_requests`, de daglimiet per persoon, en de cijfers voor
 * Beheer, AI. Nooit de inhoud van een verzoek: alleen wie, wat, hoeveel en hoe het afliep. Lezen kan
 * alleen met het recht `admin:ai`; schrijven doet alleen `runPrompt`.
 */
import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import type { Actor } from "@/lib/auth/actor";
import { assertCan } from "@/lib/auth/can";
import type { DbOrTransaction } from "@/lib/db/client";
import { aiRequests, users, type AiRequestStatus } from "@/lib/db/schema";
import { todayIso } from "@/lib/domain/dates";

/** Hoeveel verzoeken deze persoon vandaag deed met deze prompt; de daglimiet telt alles, ook wat misging. */
export async function countToday(db: DbOrTransaction, organisationId: string, userId: string, promptKey: string, day: string = todayIso()): Promise<number> {
  const row = (
    await db
      .select({ n: count() })
      .from(aiRequests)
      .where(and(eq(aiRequests.organisationId, organisationId), eq(aiRequests.userId, userId), eq(aiRequests.promptKey, promptKey), eq(aiRequests.day, day)))
  )[0];
  return Number(row?.n ?? 0);
}

export interface RequestLog {
  readonly organisationId: string;
  readonly userId: string;
  readonly promptKey: string;
  readonly promptVersion: number;
  readonly model: string;
  readonly status: AiRequestStatus;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly inputCentsPerMtok: number | null;
  readonly outputCentsPerMtok: number | null;
  readonly currency: string | null;
  readonly durationMs: number;
  readonly day: string;
  readonly error: string | null;
}

export async function logRequest(db: DbOrTransaction, entry: RequestLog): Promise<string> {
  const row = (await db.insert(aiRequests).values(entry).returning({ id: aiRequests.id }))[0];
  if (row === undefined) throw new Error("ai_requests: de regel is niet weggeschreven");
  return row.id;
}

/** De eerste dag van deze maand, in de tijdzone van het project. */
export function monthStart(today: string = todayIso()): string {
  return `${today.slice(0, 8)}01`;
}

export interface MonthTotals {
  readonly requests: number;
  readonly failed: number;
  /** Centtokens per valuta (zie lib/ai/cost.ts); verzoeken zonder prijs tellen hier niet mee. */
  readonly costs: readonly { readonly currency: string; readonly centTokens: number }[];
  readonly unpriced: number;
}

export async function monthTotals(db: DbOrTransaction, actor: Actor, from: string = monthStart()): Promise<MonthTotals> {
  assertCan(actor, "admin:ai");
  const scope = and(eq(aiRequests.organisationId, actor.organisationId), gte(aiRequests.day, from));
  const [totals] = await db
    .select({
      requests: count(),
      failed: sql<number>`count(*) filter (where ${aiRequests.status} <> 'ok')`,
      unpriced: sql<number>`count(*) filter (where ${aiRequests.inputCentsPerMtok} is null or ${aiRequests.outputCentsPerMtok} is null)`,
    })
    .from(aiRequests)
    .where(scope);
  const costs = await db
    .select({
      currency: aiRequests.currency,
      centTokens: sql<string>`coalesce(sum(${aiRequests.inputTokens}::bigint * ${aiRequests.inputCentsPerMtok} + ${aiRequests.outputTokens}::bigint * ${aiRequests.outputCentsPerMtok}), 0)`,
    })
    .from(aiRequests)
    .where(and(scope, sql`${aiRequests.inputCentsPerMtok} is not null and ${aiRequests.outputCentsPerMtok} is not null`))
    .groupBy(aiRequests.currency);
  return {
    requests: Number(totals?.requests ?? 0),
    failed: Number(totals?.failed ?? 0),
    unpriced: Number(totals?.unpriced ?? 0),
    costs: costs.filter((row) => row.currency !== null).map((row) => ({ currency: row.currency ?? "", centTokens: Number(row.centTokens) })),
  };
}

export interface RequestLine {
  readonly id: string;
  readonly createdAt: Date;
  readonly userName: string | null;
  readonly promptKey: string;
  readonly promptVersion: number;
  readonly model: string;
  readonly status: AiRequestStatus;
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly inputCentsPerMtok: number | null;
  readonly outputCentsPerMtok: number | null;
  readonly currency: string | null;
  readonly durationMs: number;
  readonly error: string | null;
}

/** De laatste verzoeken, nieuwste eerst, met wie het deed. */
export async function recentRequests(db: DbOrTransaction, actor: Actor, limit = 100): Promise<readonly RequestLine[]> {
  assertCan(actor, "admin:ai");
  return db
    .select({
      id: aiRequests.id,
      createdAt: aiRequests.createdAt,
      userName: users.displayName,
      promptKey: aiRequests.promptKey,
      promptVersion: aiRequests.promptVersion,
      model: aiRequests.model,
      status: aiRequests.status,
      inputTokens: aiRequests.inputTokens,
      outputTokens: aiRequests.outputTokens,
      inputCentsPerMtok: aiRequests.inputCentsPerMtok,
      outputCentsPerMtok: aiRequests.outputCentsPerMtok,
      currency: aiRequests.currency,
      durationMs: aiRequests.durationMs,
      error: aiRequests.error,
    })
    .from(aiRequests)
    .leftJoin(users, eq(users.id, aiRequests.userId))
    .where(eq(aiRequests.organisationId, actor.organisationId))
    .orderBy(desc(aiRequests.createdAt))
    .limit(limit);
}

/** Voor Beheer, Systeem: hoeveel verzoeken er vandaag waren, en hoeveel daarvan misgingen. */
export async function todayLine(db: DbOrTransaction, organisationId: string, day: string = todayIso()): Promise<{ readonly requests: number; readonly failed: number }> {
  const [row] = await db
    .select({ requests: count(), failed: sql<number>`count(*) filter (where ${aiRequests.status} <> 'ok')` })
    .from(aiRequests)
    .where(and(eq(aiRequests.organisationId, organisationId), eq(aiRequests.day, day)));
  return { requests: Number(row?.requests ?? 0), failed: Number(row?.failed ?? 0) };
}
