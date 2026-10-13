/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm check:jobs`: de sloten van de wachtrij, tegen de dev-branch, alles in een transactie die
 * wordt teruggedraaid. Bewijst wat een unittest niet kan: de unieke sleutel, de lease met
 * `for update skip locked`, de telling van pogingen en het opruimen.
 */
import { and, eq, sql } from "drizzle-orm";
import { auditLog, jobs } from "../lib/db/schema";
import { systemActor } from "../lib/db/audit";
import { MAX_ATTEMPTS } from "../lib/jobs/constants";
import { done, waiting, type JobHandlers } from "../lib/jobs/handler";
import { claimJobs } from "../lib/jobs/lease";
import { enqueueJob, markFailed, pruneJobs, retryFailedJobs } from "../lib/jobs/queue";
import { processJobs } from "../lib/jobs/run";
import { createChecker, inRollback, requireContext } from "./lib/check";
import { scriptDb, withDirectDb } from "./lib/connection";
import { runScript } from "./lib/run";

const SYSTEM = "check";

runScript(async () => {
  await withDirectDb(async (pool) => {
    const db = scriptDb(pool);
    const ctx = await requireContext(db);
    const t = createChecker();
    const base = { organisationId: ctx.organisationId, system: SYSTEM, entityType: "check", entityId: "1" };

    t.section("1. De idempotentiesleutel maakt van twee keer inzetten één taak");
    await inRollback(db, async (tx) => {
      const first = await enqueueJob(tx, { ...base, operation: "create", idempotencyKey: "check:create:1" });
      const second = await enqueueJob(tx, { ...base, operation: "create", idempotencyKey: "check:create:1" });
      t.check("de eerste keer is nieuw", first.outcome, "queued");
      t.check("de tweede keer bestaat hij al, met dezelfde id", [second.outcome, second.id === first.id], ["exists", true]);
    });

    t.section("2. De lease: een tweede ronde krijgt de rijen van de eerste niet");
    await inRollback(db, async (tx) => {
      await enqueueJob(tx, { ...base, operation: "a", idempotencyKey: "check:a:1" });
      await enqueueJob(tx, { ...base, operation: "b", idempotencyKey: "check:b:1" });
      const first = await claimJobs(tx, 10, { system: SYSTEM });
      const second = await claimJobs(tx, 10, { system: SYSTEM });
      t.check("de eerste ronde eist beide op", first.length, 2);
      t.check("de tweede ronde krijgt niets", second.length, 0);
      const row = (await tx.select({ claimedUntil: jobs.claimedUntil }).from(jobs).where(eq(jobs.idempotencyKey, "check:a:1")))[0];
      t.ok("de lease staat op de rij", row?.claimedUntil instanceof Date && row.claimedUntil.getTime() > Date.now());
    });

    t.section("3. Pogingen tellen, en na de laatste blijft een taak op mislukt staan");
    await inRollback(db, async (tx) => {
      const job = await enqueueJob(tx, { ...base, operation: "fail", idempotencyKey: "check:fail:1" });
      let outcome: "retry" | "failed" = "retry";
      for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) outcome = await markFailed(tx, job.id, `poging ${attempt + 1} mislukt`, attempt);
      const row = (await tx.select({ status: jobs.status, attempts: jobs.attempts, lastError: jobs.lastError }).from(jobs).where(eq(jobs.id, job.id)))[0];
      t.check("de laatste poging maakt hem definitief mislukt", [outcome, row?.status, row?.attempts], ["failed", "failed", MAX_ATTEMPTS]);
      t.check("de fout staat op de rij", row?.lastError, `poging ${MAX_ATTEMPTS} mislukt`);

      const revived = await enqueueJob(tx, { ...base, operation: "fail", idempotencyKey: "check:fail:1" });
      t.check("opnieuw inzetten zet een mislukte taak weer klaar", revived.outcome, "revived");

      await markFailed(tx, job.id, "weer mis", MAX_ATTEMPTS);
      const retried = await retryFailedJobs(tx, systemActor(ctx.organisationId));
      const audit = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(auditLog)
        .where(and(eq(auditLog.entityTable, "jobs"), eq(auditLog.entityId, job.id)));
      t.check("de knop 'opnieuw' zet hem klaar en schrijft een auditregel", [retried, Number(audit[0]?.n ?? 0)], [1, 1]);
    });

    t.section("4. Een ronde geeft elke taak aan zijn handler en zet de stand om");
    await inRollback(db, async (tx) => {
      const handlers: JobHandlers = {
        "check:ok": async () => done({ id: 42 }),
        "check:later": async () => waiting("de ouder bestaat nog niet"),
        "check:boom": async () => {
          throw new Error("buiten zegt nee");
        },
      };
      await enqueueJob(tx, { ...base, operation: "ok", idempotencyKey: "check:ok:1" });
      await enqueueJob(tx, { ...base, operation: "later", idempotencyKey: "check:later:1" });
      await enqueueJob(tx, { ...base, operation: "boom", idempotencyKey: "check:boom:1" });
      await enqueueJob(tx, { ...base, operation: "unknown", idempotencyKey: "check:unknown:1" });

      const report = await processJobs(tx, { system: SYSTEM, handlers });
      t.check("de telling van de ronde", report, { claimed: 4, done: 1, waiting: 1, retried: 1, failed: 1 });

      const rows = await tx.select({ key: jobs.idempotencyKey, status: jobs.status, response: jobs.response, waitingFor: jobs.waitingFor, lastError: jobs.lastError }).from(jobs).where(eq(jobs.system, SYSTEM));
      const by = new Map(rows.map((row) => [row.key, row]));
      t.check("klaar, met het antwoord bewaard", [by.get("check:ok:1")?.status, by.get("check:ok:1")?.response], ["done", { id: 42 }]);
      t.check("wacht, met de reden", [by.get("check:later:1")?.status, by.get("check:later:1")?.waitingFor], ["waiting", "de ouder bestaat nog niet"]);
      t.check("mislukt maar komt terug", [by.get("check:boom:1")?.status, by.get("check:boom:1")?.lastError], ["pending", "buiten zegt nee"]);
      t.ok("zonder handler definitief mislukt, met de sleutel in de fout", by.get("check:unknown:1")?.status === "failed" && (by.get("check:unknown:1")?.lastError ?? "").includes("check:unknown"));
    });

    t.section("5. Afgehandeld werk van langer geleden gaat weg, de rest blijft");
    await inRollback(db, async (tx) => {
      const old = await enqueueJob(tx, { ...base, operation: "old", idempotencyKey: "check:old:1" });
      const fresh = await enqueueJob(tx, { ...base, operation: "fresh", idempotencyKey: "check:fresh:1" });
      const longAgo = new Date(Date.now() - 40 * 24 * 60 * 60 * 1000);
      await tx.update(jobs).set({ status: "done", completedAt: longAgo }).where(eq(jobs.id, old.id));
      await tx.update(jobs).set({ status: "done", completedAt: new Date() }).where(eq(jobs.id, fresh.id));
      const removed = await pruneJobs(tx);
      const left = await tx.select({ id: jobs.id }).from(jobs).where(eq(jobs.system, SYSTEM));
      t.check("één weg, één over", [removed, left.length], [1, 1]);
    });

    t.summary("check:jobs");
  });
});
