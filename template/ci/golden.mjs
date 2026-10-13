/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De gouden test van het template: maak een vers project uit deze werkkopie, pas een
 * voorbeeldconfiguratie toe en bewijs dat alles bouwt en dat apply idempotent is.
 *
 *   node template/ci/golden.mjs voorbeeld        één configuratie uit examples/
 *   node template/ci/golden.mjs --keep minimaal  laat de map staan om erin te kijken
 *
 * Het pad van de tijdelijke map bevat met opzet een spatie en een &: dat is de vorm die op Windows
 * geneste pnpm-scripts brak, en de tooling hoort er niets van te merken.
 *
 * Stappen: kopie van de werkkopie (zonder node_modules en .next), de voorbeeldconfig over
 * project.config.json, git init en commit, pnpm install, template:apply --strict, de batterij
 * zonder database (typecheck, lint, test, check:migrations, check:drift, check:contrast,
 * template:verify, build), een tweede apply en template:generate die niets mogen veranderen.
 */

import { spawnSync } from "node:child_process";
import { cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join, relative, sep } from "node:path";

/** Wat niet mee kopieert: afhankelijkheden, bouwuitvoer, git, en elk .env-bestand behalve het sjabloon, zodat de run gegarandeerd zonder database en zonder geheimen is. */
const SKIPPED = new Set(["node_modules", ".next", ".git", ".vercel", ".template-backup", "coverage", "playwright-report", "test-results"]);
function excluded(source, path) {
  const rel = relative(source, path).split(sep).join("/");
  if (rel === "") return false;
  const parts = rel.split("/");
  if (parts.some((part) => SKIPPED.has(part))) return true;
  const name = parts[parts.length - 1] ?? "";
  return name.startsWith(".env") && name !== ".env.example";
}

const args = process.argv.slice(2);
const keep = args.includes("--keep");
const example = args.find((arg) => !arg.startsWith("--")) ?? "default";
const source = process.cwd();

const base = mkdtempSync(join(tmpdir(), "bb foundation & golden-"));
const root = join(base, "project");

/**
 * pnpm zonder shell. Op Windows is `pnpm` een .cmd-shim die cmd.exe nodig heeft, en de shim van
 * een globale npm-installatie breekt op een & in het gebruikerspad (precies de les die dit script
 * bewaakt). Daarom zoeken we het JavaScript-startpunt van pnpm en draaien dat met deze node:
 * onder pnpm zelf staat het in npm_execpath, anders staat het naast de shim op het PATH.
 */
function pnpmLauncher() {
  const exec = process.env.npm_execpath;
  if (exec !== undefined && exec !== "") return /\.[cm]?js$/.test(exec) ? [process.execPath, exec] : [exec];
  for (const dir of (process.env.PATH ?? "").split(delimiter).filter((entry) => entry !== "")) {
    for (const candidate of [
      join(dir, "node_modules", "pnpm", "bin", "pnpm.cjs"), // npm global prefix op Windows
      join(dir, "..", "pnpm", "bin", "pnpm.cjs"), // een node_modules/.bin, zoals pnpm/action-setup
      join(dir, "..", "lib", "node_modules", "pnpm", "bin", "pnpm.cjs"), // npm global prefix op Linux en macOS
    ]) {
      if (existsSync(candidate)) return [process.execPath, candidate];
    }
  }
  return ["pnpm"];
}
const PNPM = pnpmLauncher();

function run(command, commandArgs) {
  const started = Date.now();
  const [executable, ...prefix] = command === "pnpm" ? PNPM : [command];
  const result = spawnSync(executable, [...prefix, ...commandArgs], { cwd: root, stdio: "inherit", shell: false });
  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  if (result.error !== undefined || result.status !== 0) {
    console.error(`\nGouden test gestopt bij: ${command} ${commandArgs.join(" ")} (${seconds} s)${result.error === undefined ? "" : `: ${result.error.message}`}`);
    console.error(`De map staat nog: ${root}`);
    process.exit(result.status ?? 1);
  }
  console.log(`  klaar in ${seconds} s: ${command} ${commandArgs.join(" ")}`);
}

console.log(`Gouden test met examples/${example}.project.config.json in ${root}\n`);

console.log("1. Een vers project uit de werkkopie");
cpSync(source, root, { recursive: true, filter: (path) => !excluded(source, path) });
/*
 * Precies wat "Use this template" op GitHub oplevert: de hele wortel, inclusief template.lock.json,
 * waarin staat wat het template als neutrale standaard meeleverde. Daarna zet het project zijn eigen
 * configuratie over de standaard, zoals de handleiding zegt.
 */
if (!existsSync(join(root, "template.lock.json"))) {
  console.error("De werkkopie heeft geen template.lock.json; draai eerst pnpm template:apply in de templaterepo.");
  process.exit(1);
}
const config = readFileSync(join(source, "examples", `${example}.project.config.json`), "utf8").replace('"../template/schema/', '"./template/schema/');
writeFileSync(join(root, "project.config.json"), config);
run("git", ["init", "--quiet", "--initial-branch=main"]);
run("git", ["add", "-A"]);
run("git", ["-c", "user.name=golden", "-c", "user.email=golden@voorbeeld.invalid", "commit", "--quiet", "-m", "Vers project uit het template"]);

console.log("\n2. Afhankelijkheden");
run("pnpm", ["install", "--frozen-lockfile", "--prefer-offline"]);

console.log("\n3. Het template toepassen");
run("pnpm", ["template:apply", "--strict", "--allow-dirty"]);

console.log("\n4. De batterij zonder database");
for (const script of ["typecheck", "lint", "test", "check:migrations", "check:drift", "check:contrast", "template:verify", "build"]) {
  run("pnpm", [script]);
}

console.log("\n5. Idempotentie: een tweede apply en generate veranderen niets");
run("git", ["add", "-A"]);
/* --allow-empty: op de standaardconfig verandert apply niets, en dat is geen fout. */
run("git", ["-c", "user.name=golden", "-c", "user.email=golden@voorbeeld.invalid", "commit", "--quiet", "--allow-empty", "-m", "Na apply"]);
run("pnpm", ["template:apply", "--strict"]);
run("pnpm", ["template:generate"]);
const status = spawnSync("git", ["status", "--porcelain"], { cwd: root, encoding: "utf8" }).stdout.trim();
if (status !== "") {
  console.error("\nDe tweede apply of generate heeft iets veranderd:\n" + status);
  console.error(`De map staat nog: ${root}`);
  process.exit(1);
}

console.log(`\nGouden test geslaagd voor examples/${example}.project.config.json.`);
if (keep) console.log(`De map staat nog: ${root}`);
else rmSync(base, { recursive: true, force: true });
