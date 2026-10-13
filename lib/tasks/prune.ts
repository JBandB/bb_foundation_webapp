/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het nachtelijke opruimen: wat weg mag, gaat weg. Gedeeld door de cronroute en `pnpm task:prune`,
 * zodat die twee precies hetzelfde doen.
 *
 * **Wat hier nooit bij komt:** de audit log en zachtverwijderde rijen. De eerste is append-only en
 * de tweede is bewust bewaard. Die twee groeien en dat hoort zo.
 *
 * Modules en het project haken hier aan via `PRUNE_STEPS` in `prune.project.ts`: elke stap geeft
 * terug hoeveel rijen er weg zijn, voor het log.
 */
import type { DbOrTransaction } from "@/lib/db/client";
import { pruneRateLimits } from "@/lib/domain/rate-limit";
import { PROJECT_PRUNE_STEPS } from "./prune.project";

export interface PruneStep {
  readonly name: string;
  readonly run: (db: DbOrTransaction, now: Date) => Promise<number>;
}

export const CORE_PRUNE_STEPS: readonly PruneStep[] = [{ name: "rate_limits", run: (db, now) => pruneRateLimits(db, now) }];

export async function runPrune(db: DbOrTransaction, now: Date = new Date()): Promise<Record<string, number>> {
  const result: Record<string, number> = {};
  for (const step of [...CORE_PRUNE_STEPS, ...PROJECT_PRUNE_STEPS]) result[step.name] = await step.run(db, now);
  return result;
}
