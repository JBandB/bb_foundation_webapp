/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Opruimen, met de hand. Zie lib/tasks/prune.ts voor het wat en het waarom.
 *
 * Gebruik: pnpm task:prune
 *
 * Elke crontaak is ook een script, zodat je hem kunt draaien zonder op de nacht te wachten en kunt
 * zien wat hij doet.
 */

import { closeDb, getDb } from "../lib/db/client";
import { runPrune } from "../lib/tasks/prune";
import { describeTarget, directUrl } from "./lib/connection";
import { runScript } from "./lib/run";

runScript(async () => {
  console.log(`Opruimen op endpoint ${describeTarget(directUrl())}\n`);
  const removed = await runPrune(getDb());
  for (const [name, count] of Object.entries(removed)) console.log(`  ${name.padEnd(24)} ${count} rij(en) weg`);
  await closeDb();
});
