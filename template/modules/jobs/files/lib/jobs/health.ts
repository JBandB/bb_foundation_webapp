/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De stand van de wachtrij per systeem, voor Beheer en voor de koppelingenlijst op Systeem.
 *
 * **Rekenen en versturen staan los van elkaar.** Deze module leest alleen, zodat het openen van een
 * beheerscherm nooit een aanroep naar buiten doet. Een rij die blijft staan is stil: in een eerder
 * project wachtten acht verzoeken en zes mails wekenlang en het enige wat je merkte was dat er geen
 * mail kwam. Daarom telt dit scherm en zegt het "vastgelopen" als dat zo is.
 */
import { count, eq, max, min, sql } from "drizzle-orm";
import type { DbOrTransaction } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { PROJECT } from "@/lib/project/config.generated";
import { STUCK_AFTER_MINUTES } from "./constants";
import { shorten } from "./queue";

export interface QueueLine {
  readonly system: string;
  readonly pending: number;
  readonly waiting: number;
  readonly failed: number;
  readonly done: number;
  /** De oudste die nog niet klaar is. Leeg als er niets wacht. */
  readonly oldestPending: Date | null;
  /** Wanneer er voor het laatst iets aan deze regel is bijgewerkt. */
  readonly lastActivity: Date | null;
  /** De laatste fout van wat nog open staat, afgekapt. */
  readonly lastError: string | null;
  /** Waar het oudste wachtende werk op wacht. */
  readonly waitingFor: string | null;
}

/**
 * Is deze wachtrij vastgelopen. **Twee dingen moeten waar zijn**: er wacht iets dat oud is, én in
 * diezelfde tijd is er niets gebeurd. Alleen "er wacht iets ouds" is geen storing: werk dat op zijn
 * ouder wacht is net nog netjes opnieuw geprobeerd. Alleen "er is niets gebeurd" ook niet: een lege
 * rij hoort stil te zijn. Puur, zodat het te testen is zonder database.
 */
export function isStuck(line: QueueLine, now: Date, afterMinutes: number = STUCK_AFTER_MINUTES): boolean {
  if (line.oldestPending === null) return false;
  const limit = afterMinutes * 60 * 1000;
  if (now.getTime() - line.oldestPending.getTime() < limit) return false;
  if (line.lastActivity === null) return true;
  return now.getTime() - line.lastActivity.getTime() >= limit;
}

export function totalWaiting(lines: readonly QueueLine[]): number {
  return lines.reduce((total, line) => total + line.pending + line.waiting, 0);
}

export function totalFailed(lines: readonly QueueLine[]): number {
  return lines.reduce((total, line) => total + line.failed, 0);
}

export async function loadJobsHealth(db: DbOrTransaction, organisationId: string): Promise<QueueLine[]> {
  const countWhere = (condition: ReturnType<typeof eq>) => count(sql`case when ${condition} then 1 end`);

  const rows = await db
    .select({
      system: jobs.system,
      pending: countWhere(eq(jobs.status, "pending")),
      waiting: countWhere(eq(jobs.status, "waiting")),
      failed: countWhere(eq(jobs.status, "failed")),
      done: countWhere(eq(jobs.status, "done")),
      oldestPending: min(sql<Date>`case when ${jobs.status} in ('pending', 'waiting') then ${jobs.createdAt} end`),
      lastActivity: max(jobs.updatedAt),
      lastError: sql<string | null>`(
        array_remove(array_agg(${jobs.lastError} order by ${jobs.updatedAt} desc)
          filter (where ${jobs.status} <> 'done'), null)
      )[1]`,
      waitingFor: sql<string | null>`(
        array_remove(array_agg(${jobs.waitingFor} order by ${jobs.createdAt}), null)
      )[1]`,
    })
    .from(jobs)
    .where(eq(jobs.organisationId, organisationId))
    .groupBy(jobs.system)
    .orderBy(jobs.system);

  return rows.map((row) => ({
    system: row.system,
    pending: Number(row.pending),
    waiting: Number(row.waiting),
    failed: Number(row.failed),
    done: Number(row.done),
    oldestPending: toDate(row.oldestPending),
    lastActivity: toDate(row.lastActivity),
    lastError: row.lastError === null ? null : shorten(row.lastError),
    waitingFor: row.waitingFor,
  }));
}

function toDate(value: unknown): Date | null {
  if (value === null || value === undefined) return null;
  if (value instanceof Date) return value;
  const parsed = new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/** Een tijdstip als `24 aug 13:05` in de taal en tijdzone van het project. Nooit een rauwe ISO-string op een scherm. */
export function formatMoment(value: Date): string {
  return new Intl.DateTimeFormat(PROJECT.locale, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: PROJECT.timezone }).format(value);
}
