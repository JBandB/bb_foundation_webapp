/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Werk dat stilstaat, gemeld aan een mens. Een rij die blijft staan is stil: zonder deze melding
 * merk je pas dat er iets mis is als iemand vraagt waarom de mail niet kwam. Eén melding per
 * koppeling per dag per ontvanger; de drempel komt uit de instelling van `integration_stuck`.
 *
 * Rekenen (`stuckSignals`) staat los van lezen en versturen, zodat het te testen is.
 */
import { count, eq, max, min, sql } from "drizzle-orm";
import type { DbOrTransaction } from "@/lib/db/client";
import { outbox } from "@/lib/db/schema";
import { todayIso } from "@/lib/domain/dates";
import { labels } from "@/lib/i18n/labels";
import { isStuck, loadJobsHealth, type QueueLine } from "@/lib/jobs/health";
import { enqueueKind } from "./enqueue-kind";
import { loadSettings, settingFor } from "./settings";

export interface StuckSignal {
  /** `jobs:<systeem>` of `outbox`. */
  readonly name: string;
  readonly waiting: number;
}

export function stuckSignals(input: { readonly jobs: readonly QueueLine[]; readonly outbox: QueueLine | null; readonly thresholdMinutes: number; readonly now: Date }): StuckSignal[] {
  const signals: StuckSignal[] = [];
  for (const line of input.jobs) {
    if (isStuck(line, input.now, input.thresholdMinutes)) signals.push({ name: `jobs:${line.system}`, waiting: line.pending + line.waiting });
  }
  if (input.outbox !== null && isStuck(input.outbox, input.now, input.thresholdMinutes)) signals.push({ name: "outbox", waiting: input.outbox.pending });
  return signals;
}

/** De outbox als één regel in dezelfde vorm als de wachtrij, zodat `isStuck` ervoor geldt. */
export async function loadOutboxLine(db: DbOrTransaction, organisationId: string): Promise<QueueLine | null> {
  const row = (
    await db
      .select({
        pending: count(sql`case when ${outbox.status} = 'pending' then 1 end`),
        failed: count(sql`case when ${outbox.status} = 'failed' then 1 end`),
        done: count(sql`case when ${outbox.status} = 'sent' then 1 end`),
        oldestPending: min(sql<Date>`case when ${outbox.status} = 'pending' then ${outbox.createdAt} end`),
        lastActivity: max(outbox.updatedAt),
      })
      .from(outbox)
      .where(eq(outbox.organisationId, organisationId))
  )[0];
  if (row === undefined) return null;
  return {
    system: "outbox",
    pending: Number(row.pending),
    waiting: 0,
    failed: Number(row.failed),
    done: Number(row.done),
    oldestPending: toDate(row.oldestPending),
    lastActivity: toDate(row.lastActivity),
    lastError: null,
    waitingFor: null,
  };
}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export interface StuckRun {
  readonly signals: number;
  readonly queued: number;
}

export async function runStuckAlerts(db: DbOrTransaction, organisationId: string, now: Date = new Date()): Promise<StuckRun> {
  const settings = await loadSettings(db, organisationId);
  const setting = settingFor(settings, "integration_stuck");
  if (!setting.enabled) return { signals: 0, queued: 0 };

  const signals = stuckSignals({
    jobs: await loadJobsHealth(db, organisationId),
    outbox: await loadOutboxLine(db, organisationId),
    thresholdMinutes: setting.threshold ?? 60,
    now,
  });
  if (signals.length === 0) return { signals: 0, queued: 0 };

  const today = todayIso(now);
  let queued = 0;
  for (const signal of signals) {
    const result = await enqueueKind(
      db,
      organisationId,
      "integration_stuck",
      { about: `${signal.name}:${today}`, subject: labels.messaging.stuckSubject(signal.name), bodyMd: labels.messaging.stuckBody(signal.name, signal.waiting) },
      settings,
    );
    queued += result.queued;
  }
  return { signals: signals.length, queued };
}
