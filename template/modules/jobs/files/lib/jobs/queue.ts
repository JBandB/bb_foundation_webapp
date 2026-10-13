/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Werk in de rij zetten en de stand van een taak omzetten. Deze module raakt niets buiten de
 * database: afleveren doet lib/jobs/run.ts met de handlers van het project.
 *
 * **Inzetten gebeurt met `on conflict do nothing`** en niet met een gevangen unieke fout: een
 * mislukte insert maakt in Postgres de hele transactie onbruikbaar, en inzetten gebeurt meestal
 * binnen de transactie van de handeling die het werk veroorzaakt.
 */
import { and, eq, lt } from "drizzle-orm";
import { appendAuditLog, type AuditActor } from "@/lib/db/audit";
import type { DbOrTransaction } from "@/lib/db/client";
import { jobs } from "@/lib/db/schema";
import { KEEP_DONE_DAYS, MAX_ATTEMPTS } from "./constants";

export type EnqueueOutcome =
  /** Nieuw in de rij. */
  | "queued"
  /** Stond er al en is nog niet klaar, of is al klaar: er is niets gedaan. */
  | "exists"
  /** Stond op mislukt en staat weer klaar. */
  | "revived";

export interface EnqueueInput {
  readonly organisationId: string;
  readonly system: string;
  readonly operation: string;
  readonly entityType: string;
  readonly entityId: string;
  /** Onze eigen id plus wat we willen bereiken, zoals `crm:create_contact:<id>`. Nooit iets tijdgebondens. */
  readonly idempotencyKey: string;
  readonly request?: unknown;
}

export async function enqueueJob(db: DbOrTransaction, input: EnqueueInput): Promise<{ readonly outcome: EnqueueOutcome; readonly id: string }> {
  const inserted = (
    await db
      .insert(jobs)
      .values({
        organisationId: input.organisationId,
        system: input.system,
        operation: input.operation,
        entityType: input.entityType,
        entityId: input.entityId,
        idempotencyKey: input.idempotencyKey,
        request: input.request ?? null,
      })
      .onConflictDoNothing({ target: jobs.idempotencyKey })
      .returning({ id: jobs.id })
  )[0];
  if (inserted !== undefined) return { outcome: "queued", id: inserted.id };

  const existing = (await db.select({ id: jobs.id, status: jobs.status }).from(jobs).where(eq(jobs.idempotencyKey, input.idempotencyKey)))[0];
  if (existing === undefined) throw new Error(`De taak ${input.idempotencyKey} bestaat en bestaat niet; dat kan alleen als hij net is verwijderd. Probeer het opnieuw.`);

  if (existing.status === "failed") {
    await db.update(jobs).set({ status: "pending", attempts: 0, lastError: null, claimedUntil: null, updatedAt: new Date() }).where(eq(jobs.id, existing.id));
    return { outcome: "revived", id: existing.id };
  }
  return { outcome: "exists", id: existing.id };
}

export async function markDone(db: DbOrTransaction, id: string, response?: unknown): Promise<void> {
  const now = new Date();
  await db
    .update(jobs)
    .set({ status: "done", response: response ?? null, completedAt: now, claimedUntil: null, lastError: null, waitingFor: null, updatedAt: now })
    .where(eq(jobs.id, id));
}

export async function markWaiting(db: DbOrTransaction, id: string, reason: string): Promise<void> {
  await db.update(jobs).set({ status: "waiting", waitingFor: shorten(reason), claimedUntil: null, updatedAt: new Date() }).where(eq(jobs.id, id));
}

/** Een mislukte poging: terug in de rij, of definitief mislukt na MAX_ATTEMPTS. */
export async function markFailed(db: DbOrTransaction, id: string, message: string, attemptsSoFar: number): Promise<"retry" | "failed"> {
  const attempts = attemptsSoFar + 1;
  const final = attempts >= MAX_ATTEMPTS;
  await db
    .update(jobs)
    .set({ status: final ? "failed" : "pending", attempts, lastError: shorten(message), claimedUntil: null, waitingFor: null, updatedAt: new Date() })
    .where(eq(jobs.id, id));
  return final ? "failed" : "retry";
}

/** Alle mislukte taken van de organisatie weer klaarzetten, met een auditregel per taak. */
export async function retryFailedJobs(db: DbOrTransaction, actor: AuditActor): Promise<number> {
  const rows = await db
    .update(jobs)
    .set({ status: "pending", attempts: 0, claimedUntil: null, updatedAt: new Date() })
    .where(and(eq(jobs.organisationId, actor.organisationId), eq(jobs.status, "failed")))
    .returning({ id: jobs.id });
  for (const row of rows) {
    await appendAuditLog(db, actor, { entityTable: "jobs", entityId: row.id, action: "update", before: { status: "failed" }, after: { status: "pending" } });
  }
  return rows.length;
}

/** Afgehandeld werk ouder dan KEEP_DONE_DAYS gaat weg. De audit log houdt wat ertoe doet. */
export async function pruneJobs(db: DbOrTransaction, now: Date = new Date(), keepDays: number = KEEP_DONE_DAYS): Promise<number> {
  const limit = new Date(now.getTime() - keepDays * 24 * 60 * 60 * 1000);
  const rows = await db
    .delete(jobs)
    .where(and(eq(jobs.status, "done"), lt(jobs.completedAt, limit)))
    .returning({ id: jobs.id });
  return rows.length;
}

/** Een fout van buiten is soms een halve HTML-pagina. Eén regel is genoeg om te weten wat er is. */
const MAX_TEXT = 500;

export function shorten(text: string): string {
  const firstLine = text.split("\n")[0]?.trim() ?? "";
  return firstLine.length <= MAX_TEXT ? firstLine : `${firstLine.slice(0, MAX_TEXT)}...`;
}
