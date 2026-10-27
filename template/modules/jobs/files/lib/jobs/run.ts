/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Eén ronde: taken opeisen, elke taak aan zijn handler geven, de stand omzetten. Wordt aangeroepen
 * door de cron, door `pnpm task:jobs`, door de knop op Beheer, en direct na een handeling via
 * lib/jobs/kick.ts.
 *
 * **Een taak zonder handler mislukt meteen definitief**, met de sleutel in de fout: dat is een
 * programmeerfout en geen storing buiten, en vijf keer proberen maakt hem niet beter.
 */
import type { DbOrTransaction } from "@/lib/db/client";
import { errorForScreen } from "@/lib/monitoring/error-text";
import { ROUND_LIMIT } from "./constants";
import { handlerKey, type JobHandlers } from "./handler";
import { JOB_HANDLERS } from "./handlers";
import { claimJobs } from "./lease";
import { markDone, markFailed, markWaiting } from "./queue";

export interface RunReport {
  readonly claimed: number;
  readonly done: number;
  readonly waiting: number;
  /** Mislukt maar komt terug. */
  readonly retried: number;
  /** Definitief mislukt. */
  readonly failed: number;
}

export interface RunOptions {
  readonly limit?: number;
  /** Alleen dit systeem, zoals na een handeling die precies één soort werk inzette. */
  readonly system?: string | undefined;
  /** Voor de checks: eigen handlers in plaats van die van het project. */
  readonly handlers?: JobHandlers;
}

export async function processJobs(db: DbOrTransaction, options: RunOptions = {}): Promise<RunReport> {
  const handlers = options.handlers ?? JOB_HANDLERS;
  const claimed = await claimJobs(db, options.limit ?? ROUND_LIMIT, { system: options.system });
  let done = 0;
  let waiting = 0;
  let retried = 0;
  let failed = 0;

  for (const job of claimed) {
    const key = handlerKey(job.system, job.operation);
    const handler = handlers[key];
    if (handler === undefined) {
      await markFailed(db, job.id, `no handler for ${key}; add it to lib/jobs/handlers.ts`, Number.MAX_SAFE_INTEGER);
      failed += 1;
      continue;
    }

    try {
      const result = await handler({ ...job, db });
      if (result.kind === "done") {
        await markDone(db, job.id, result.response);
        done += 1;
      } else {
        await markWaiting(db, job.id, result.reason);
        waiting += 1;
      }
    } catch (error) {
      const outcome = await markFailed(db, job.id, errorForScreen(error), job.attempts);
      if (outcome === "failed") failed += 1;
      else retried += 1;
    }
  }

  return { claimed: claimed.length, done, waiting, retried, failed };
}
