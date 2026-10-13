/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/** `pnpm task:outbox`: één verzendronde plus de vastloopcontrole, vanaf je eigen machine. */
import { closeDb, getDb } from "../lib/db/client";
import { organisations } from "../lib/db/schema";
import { pruneOutbox } from "../lib/messaging/outbox";
import { sendPending } from "../lib/messaging/send";
import { runStuckAlerts } from "../lib/messaging/stuck-alerts";
import { describeTarget, directUrl } from "./lib/connection";
import { runScript } from "./lib/run";

runScript(async () => {
  console.log(`Outbox versturen op endpoint ${describeTarget(directUrl())}\n`);
  const db = getDb();
  const organisation = (await db.select({ id: organisations.id }).from(organisations).limit(1))[0];
  if (organisation === undefined) throw new Error("Er is nog geen organisatie; draai eerst pnpm db:bootstrap.");

  const run = await sendPending(db, organisation.id);
  if (!run.configured) console.log(`Het transport is niet ingericht; ontbreekt: ${run.missing.join(", ")}.\n`);
  const stuck = await runStuckAlerts(db, organisation.id);
  const pruned = await pruneOutbox(db);
  for (const [name, value] of Object.entries({ pending: run.pending, sent: run.sent, failed: run.failed, stuck: stuck.signals, stuckQueued: stuck.queued, pruned })) {
    console.log(`  ${name.padEnd(12)} ${value}`);
  }
  await closeDb();
});
