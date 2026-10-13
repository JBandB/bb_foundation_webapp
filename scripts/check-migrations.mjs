#!/usr/bin/env node
/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Controleert de migraties zonder een database aan te raken, zodat dit in CI kan lopen op een pull
 * request van iemand zonder connectiestring.
 *
 * Regel 1  Elke migratie in het journal bestaat als bestand.
 * Regel 2  Elke migratie heeft een terugweg in down/ met dezelfde naam. Dit is de eis uit de
 *          Definition of done in CLAUDE.md.
 * Regel 3  Geen weesbestanden: geen up zonder journal-regel, geen down zonder up.
 * Regel 4  Geen leeg down-bestand, want dat is een terugweg die niets doet.
 * Regel 5  Een migratie die een enumwaarde toevoegt, gebruikt die waarde niet in hetzelfde bestand.
 *          Postgres verbiedt dat binnen één transactie, en één bestand is één transactie.
 * Regel 6  Een migratie die al op main staat, is niet gewijzigd. Zie hieronder.
 *
 * Wat hier niet gecontroleerd wordt: of de snapshot in meta/ nog overeenkomt met het schema. Dat doet
 * pnpm check:drift.
 */

import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const DIR = join(process.cwd(), "lib", "db", "migrations");
const DOWN_DIR = join(DIR, "down");

const problems = [];

if (!existsSync(DIR)) {
  console.log("Nog geen migraties aanwezig.");
  process.exit(0);
}

const journalPath = join(DIR, "meta", "_journal.json");
if (!existsSync(journalPath)) {
  console.error(`Geen journal gevonden op ${journalPath}`);
  process.exit(1);
}

const journal = JSON.parse(readFileSync(journalPath, "utf8"));
const tags = journal.entries.map((entry) => entry.tag);

const upFiles = readdirSync(DIR)
  .filter((file) => file.endsWith(".sql"))
  .map((file) => file.replace(/\.sql$/, ""));

const downFiles = existsSync(DOWN_DIR)
  ? readdirSync(DOWN_DIR)
      .filter((file) => file.endsWith(".sql"))
      .map((file) => file.replace(/\.sql$/, ""))
  : [];

for (const tag of tags) {
  if (!upFiles.includes(tag)) problems.push(`Het journal noemt ${tag}, maar ${tag}.sql bestaat niet`);
  if (!downFiles.includes(tag)) {
    problems.push(`${tag} heeft geen terugweg. Verwacht bestand: lib/db/migrations/down/${tag}.sql`);
    continue;
  }
  const down = readFileSync(join(DOWN_DIR, `${tag}.sql`), "utf8");
  const meaningful = down
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line !== "" && !line.startsWith("--"));
  if (meaningful.length === 0) problems.push(`De terugweg van ${tag} bevat geen statements, alleen commentaar`);
}

/*
 * Regel 5: een nieuwe enumwaarde is pas te gebruiken nadat de transactie is gecommit. Elke migratie
 * krijgt zijn eigen transactie (scripts/lib/migrate.ts), dus tussen twee bestanden is het veilig en
 * binnen één bestand niet. De foutmelding uit Postgres luidt "unsafe use of new value of enum type"
 * en zegt niet welk statement het probleem is.
 */
for (const tag of tags) {
  if (!upFiles.includes(tag)) continue;
  const sql = readFileSync(join(DIR, `${tag}.sql`), "utf8");

  for (const match of sql.matchAll(/ADD\s+VALUE\s+(?:IF\s+NOT\s+EXISTS\s+)?'([^']+)'/gi)) {
    const value = match[1];
    const rest = sql.slice(0, match.index) + sql.slice(match.index + match[0].length);
    if (rest.includes(`'${value}'`)) {
      problems.push(
        `${tag} voegt de enumwaarde '${value}' toe en gebruikt hem in hetzelfde bestand. Postgres weigert dat binnen één transactie. Zet het gebruik in een volgende migratie.`,
      );
    }
  }
}

for (const file of upFiles) {
  if (!tags.includes(file)) problems.push(`${file}.sql staat niet in het journal en wordt dus nooit uitgevoerd`);
}

for (const file of downFiles) {
  if (!tags.includes(file)) problems.push(`down/${file}.sql heeft geen bijbehorende migratie`);
}

/*
 * Regel 6: een migratie die al op main staat, mag niet meer wijzigen.
 *
 * Zo'n migratie wordt nooit opnieuw uitgevoerd, dus een verbetering erin bereikt een database die hem
 * al heeft niet, terwijl een latere migratie er wel van uitgaat. De regel is dus niet "wijzig geen
 * migratie" maar "schrijf een nieuwe". Deze controle maakt van die afspraak iets dat afgaat.
 *
 * Slaat over als git er niet is of main nog niet bestaat: dit is een vangnet en geen slot.
 */
function changedMigrations() {
  const run = (args) => execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();

  let base = "";
  for (const ref of ["origin/main", "main"]) {
    try {
      base = run(["merge-base", "HEAD", ref]);
      if (base !== "") break;
    } catch {
      /* De ref bestaat hier niet. Probeer de volgende. */
    }
  }
  if (base === "") return undefined;

  const existed = new Set(
    run(["ls-tree", "-r", "--name-only", base, "lib/db/migrations/"])
      .split("\n")
      .filter((line) => line.endsWith(".sql")),
  );

  /* Tegen de werkmap en niet tegen HEAD: dan gaat hij ook af vóór het committen. */
  return run(["diff", "--name-only", base, "--", "lib/db/migrations/"])
    .split("\n")
    .filter((line) => line.endsWith(".sql") && existed.has(line));
}

let changed;
try {
  changed = changedMigrations();
} catch {
  changed = undefined;
}
if (changed === undefined) {
  console.log("Regel 6 overgeslagen: geen git-repository met een main om tegen te vergelijken.\n");
} else {
  for (const file of changed) {
    problems.push(`${file} bestond al op main en is gewijzigd. Een migratie die is uitgevoerd, wijzig je niet meer: schrijf een nieuwe. Zie lib/db/migrations/README.md`);
  }
}

if (problems.length > 0) {
  console.error(`Migraties: ${problems.length} probleem(en) gevonden.\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}

console.log(`Migraties: schoon. ${tags.length} migratie(s), elk met een terugweg.`);
for (const tag of tags) console.log(`  ${tag}`);
