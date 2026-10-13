/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm task:jobs`: één ronde van de wachtrij vanaf je eigen machine, tegen de database in .env.local.
 * Hetzelfde als de cron, zonder het geheim en zonder te wachten.
 */
import { closeDb, getDb } from "../lib/db/client";
import { pruneJobs } from "../lib/jobs/queue";
import { processJobs } from "../lib/jobs/run";
import { describeTarget, directUrl } from "./lib/connection";
import { runScript } from "./lib/run";

runScript(async () => {
  console.log(`Wachtrij verwerken op endpoint ${describeTarget(directUrl())}\n`);
  const db = getDb();
  const report = await processJobs(db);
  const pruned = await pruneJobs(db);
  for (const [name, value] of Object.entries({ ...report, pruned })) console.log(`  ${name.padEnd(12)} ${value}`);
  await closeDb();
});
