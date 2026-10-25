#!/usr/bin/env node
/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Controleert of `lib/db/schema/` en `lib/db/migrations/` nog bij elkaar horen.
 *
 * Gebruik: pnpm check:drift
 *
 * Het gevaar dat dit afvangt: iemand voegt een kolom toe aan het schema, draait `pnpm db:generate`
 * niet, en de code werkt lokaal omdat zijn dev-branch die kolom al heeft via een handmatige ingreep.
 * Op productie ontbreekt hij dan. Drizzle vergelijkt het schema met de snapshot in `migrations/meta/`
 * en zwijgt als die twee gelijk zijn, dus als generate hier iets schrijft was er drift.
 *
 * De check kijkt naar het **verschil** voor en na, niet naar een schone werkmap. Anders zou hij niet
 * te draaien zijn op precies het moment dat je hem nodig hebt, namelijk terwijl je aan een migratie
 * werkt. En hij ruimt met opzet niets op: `git clean` op deze map zou een migratie kunnen wissen die
 * nog niet gecommit is.
 *
 * Raakt geen database aan. `drizzle-kit generate` leest alleen bestanden: het schema en de laatste
 * snapshot. De connectiestring hieronder is met opzet een adres waar niets luistert, zodat een
 * toekomstige versie die wel probeert te verbinden meteen faalt in plaats van stilletjes ergens
 * contact te maken.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";

/** Zo lang mag generate erover doen voordat we aannemen dat hij op input wacht. */
const TIMEOUT_MS = 60_000;

/* Geen geheim: een adres waar niets luistert, zodat drizzle-kit alleen bestanden leest. */
// secretlint-disable-next-line
const UNREACHABLE = "postgres://drift-check:none@127.0.0.1:1/none";
const DIR = join(process.cwd(), "lib", "db", "migrations");

/**
 * De stand van de migratiemap: via git als dat kan, anders de bestandsnamen. Zonder git-repository
 * (een vers project vóór de eerste commit) telt een nieuw bestand ook als drift.
 */
function snapshot() {
  try {
    return execFileSync("git", ["status", "--porcelain", "--", "lib/db/migrations"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] })
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "")
      .sort();
  } catch {
    const walk = (dir) => (existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap((entry) => (entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)])) : []);
    return walk(DIR).sort();
  }
}

const before = snapshot();

console.log("drizzle-kit generate draaien om te zien of er iets ontbreekt");

try {
  execFileSync(process.execPath, ["node_modules/drizzle-kit/bin.cjs", "generate"], {
    encoding: "utf8",
    stdio: "inherit",
    timeout: TIMEOUT_MS,
    env: { ...process.env, DATABASE_URL: UNREACHABLE, DATABASE_URL_UNPOOLED: UNREACHABLE },
  });
} catch (error) {
  console.error("\ndrizzle-kit generate is niet goed afgelopen.");
  console.error(error.message);
  process.exit(1);
}

const after = snapshot();
const added = after.filter((line) => !before.includes(line));

if (added.length === 0) {
  console.log("\nGeen drift. Schema en migraties lopen gelijk.");
  process.exit(0);
}

console.error("\nHet schema loopt voor op de migraties. Erbij gekomen:");
for (const line of added) console.error(`  ${line}`);
console.error("");
console.error("Die bestanden staan nu in je werkmap. Bekijk ze, schrijf de terugweg in");
console.error("lib/db/migrations/down/ en commit beide, of gooi ze weg als ze niet kloppen.");
process.exit(1);
