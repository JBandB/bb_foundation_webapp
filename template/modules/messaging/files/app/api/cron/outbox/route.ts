/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { requireCron } from "@/lib/cron/guard";
import { getDb } from "@/lib/db/client";
import { pruneOutbox } from "@/lib/messaging/outbox";
import { sendPending } from "@/lib/messaging/send";
import { runStuckAlerts } from "@/lib/messaging/stuck-alerts";

/**
 * Het vangnet van de outbox: versturen wat de ronde direct na een handeling liet liggen, daarna de
 * vastloopcontrole over de wachtrij en de outbox, daarna opruimen. De controle staat met opzet in
 * deze cron en niet in die van de wachtrij: valt die stil, dan gaat er vanuit hier nog bericht uit.
 */
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const context = await requireCron(request);
  if (!context.ok) return context.response;

  const db = getDb();
  const run = await sendPending(db, context.organisationId);
  if (!run.configured && run.pending > 0) {
    console.warn(`outbox: ${run.pending} bericht(en) wachten, maar het transport is niet ingericht. Ontbreekt: ${run.missing.join(", ")}.`);
  }
  const stuck = await runStuckAlerts(db, context.organisationId);
  const pruned = await pruneOutbox(db);
  return Response.json({ ...run, stuck: stuck.signals, stuckQueued: stuck.queued, pruned });
}
