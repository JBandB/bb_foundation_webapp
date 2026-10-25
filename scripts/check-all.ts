/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm check:all`: de hele batterij, goedkoopste eerst, met een samenvatting voor de rubriek Bewijs
 * van de release notes. De volgorde en de vertaling naar `node` staan in scripts/lib/battery.ts.
 *
 * Alle stappen lopen, ook na een rode: de samenvatting zegt dan wat er nog meer rood is. De stappen
 * tegen de database draaien als `.env.local` een database noemt, en worden anders zichtbaar
 * overgeslagen; met `--zonder-database` sla je ze bewust over. Exitcode 0 als alles draaide en groen
 * is, 1 bij een rode stap, 2 als er iets is overgeslagen.
 *
 * `pnpm audit --prod --audit-level=high` draait hier niet (dat zou genest `pnpm` zijn); hij draait in
 * de CI, en lokaal los.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { planBattery, summarise, type Result } from "./lib/battery";
import { runScript } from "./lib/run";

runScript(async () => {
  const pkg: unknown = JSON.parse(readFileSync("package.json", "utf8"));
  const raw = typeof pkg === "object" && pkg !== null && "scripts" in pkg && typeof pkg.scripts === "object" && pkg.scripts !== null ? Object.entries(pkg.scripts) : [];
  const scripts = Object.fromEntries(raw.filter((entry): entry is [string, string] => typeof entry[1] === "string"));
  const { steps, problems } = planBattery(scripts);
  for (const problem of problems) console.log(`Let op: ${problem}`);

  const withoutDatabase = process.argv.includes("--zonder-database");
  const hasDatabase = (process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL ?? "") !== "";

  const results: Result[] = [];
  for (const step of steps) {
    if (step.needsDatabase && (withoutDatabase || !hasDatabase)) {
      results.push({ name: step.name, outcome: "skipped", seconds: 0, note: withoutDatabase ? "met --zonder-database" : "geen database in .env.local" });
      continue;
    }
    console.log(`\n=== pnpm ${step.name}`);
    const started = Date.now();
    let ok = true;
    for (const args of step.commands) {
      const run = spawnSync(process.execPath, args, { stdio: "inherit", shell: false });
      if (run.status !== 0) {
        ok = false;
        break;
      }
    }
    results.push({ name: step.name, outcome: ok ? "ok" : "failed", seconds: (Date.now() - started) / 1000 });
  }

  const { lines, exitCode } = summarise(results);
  console.log("\nBewijs (pnpm check:all):\n");
  for (const line of lines) console.log(line);
  if (problems.length > 0) console.log(`\n${problems.length} script(s) konden niet meedoen; zie "Let op" bovenaan.`);
  console.log("Los, en in de CI: pnpm audit --prod --audit-level=high.");
  process.exitCode = problems.length > 0 && exitCode === 0 ? 2 : exitCode;
});
