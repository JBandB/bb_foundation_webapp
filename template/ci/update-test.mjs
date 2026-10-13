/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De updatetest van het template, zonder git-tags en zonder database: een project op de huidige
 * versie, een "nieuwere versie" als tweede kopie met een hoger versienummer en een gewijzigd owned
 * bestand, en dan `template:update --from` vanuit het project. Bewijst dat een owned bestand wordt
 * bijgewerkt, dat een door het project gewijzigd owned bestand blijft staan, dat de lock en de
 * tooling van het project de nieuwe versie krijgen, dat verify het gewijzigde bestand aanwijst, en
 * dat adopt dat oplost.
 *
 *   node template/ci/update-test.mjs [--keep]
 *
 * Draait met de tsx van deze werkkopie (TEMPLATE_TSX), dus het project heeft geen node_modules nodig.
 */
import { spawnSync } from "node:child_process";
import { appendFileSync, cpSync, existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, relative, sep } from "node:path";

const keep = process.argv.includes("--keep");
const source = process.cwd();
const tsx = join(source, "node_modules", "tsx", "dist", "cli.mjs");
if (!existsSync(tsx)) {
  console.error("tsx ontbreekt; draai eerst pnpm install.");
  process.exit(1);
}

const base = mkdtempSync(join(tmpdir(), "bb foundation & update-"));
const project = join(base, "project");
const newer = join(base, "newer");

const SKIPPED = new Set(["node_modules", ".next", ".git", ".vercel", ".template-backup", "coverage", "playwright-report", "test-results"]);
function excluded(path) {
  const rel = relative(source, path).split(sep).join("/");
  if (rel === "") return false;
  const parts = rel.split("/");
  if (parts.some((part) => SKIPPED.has(part))) return true;
  const name = parts[parts.length - 1] ?? "";
  return name.startsWith(".env") && name !== ".env.example";
}

function fail(message) {
  console.error(`\nUpdatetest mislukt: ${message}`);
  console.error(`De mappen staan nog: ${base}`);
  process.exit(1);
}

function tooling(cwd, mainFrom, args) {
  const result = spawnSync(process.execPath, [tsx, join(mainFrom, "template", "cli", "main.ts"), ...args], { cwd, encoding: "utf8", env: { ...process.env, TEMPLATE_TSX: tsx } });
  return { status: result.status ?? 1, output: `${result.stdout}${result.stderr}` };
}

function git(args) {
  const result = spawnSync("git", args, { cwd: project, encoding: "utf8" });
  if (result.status !== 0) fail(`git ${args.join(" ")}: ${result.stderr}`);
}

console.log(`Updatetest in ${base}\n`);

console.log("1. Een project op de huidige versie, en een nieuwere versie van het template");
cpSync(source, project, { recursive: true, filter: (path) => !excluded(path) });
cpSync(source, newer, { recursive: true, filter: (path) => !excluded(path) });
if (!existsSync(join(project, "template.lock.json"))) fail("de werkkopie heeft geen template.lock.json; draai eerst pnpm template:apply");
git(["init", "--quiet", "--initial-branch=main"]);
git(["add", "-A"]);
git(["-c", "user.name=update", "-c", "user.email=update@voorbeeld.invalid", "commit", "--quiet", "-m", "Project op de huidige versie"]);

const manifestPath = join(newer, "template", "manifest.json");
const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
const current = manifest.version;
const [major, minor, patch] = current.split(".").map(Number);
const next = `${major}.${minor}.${patch + 1}`;
writeFileSync(manifestPath, readFileSync(manifestPath, "utf8").replace(`"version": "${current}"`, `"version": "${next}"`));
const changelogPath = join(newer, "template", "CHANGELOG.md");
writeFileSync(changelogPath, readFileSync(changelogPath, "utf8").replace("## Nog niet uitgebracht", `## v${next} (updatetest)\n\n- De testwijziging van de updatetest.\n\n## Nog niet uitgebracht`));
const MARK_NEW = "/* updatetest: deze regel komt uit de nieuwere versie */";
appendFileSync(join(newer, "lib", "integrations", "http.ts"), `\n${MARK_NEW}\n`);
console.log(`  nieuwere versie: ${current} wordt ${next}, met een wijziging in lib/integrations/http.ts`);

console.log("\n2. Het project wijzigt zelf een owned bestand");
const MARK_LOCAL = "/* updatetest: deze regel is van het project */";
appendFileSync(join(project, "components", "ui", "chip.tsx"), `\n${MARK_LOCAL}\n`);

console.log("\n3. template:update --from de nieuwere versie");
const update = tooling(project, project, ["update", "--from", newer, "--allow-dirty"]);
if (update.status !== 0) fail(`update gaf exitcode ${update.status}:\n${update.output}`);
if (!update.output.includes(`v${next}`)) fail(`de slottekst noemt de nieuwe versie niet:\n${update.output}`);
if (!update.output.includes("OVERGESLAGEN gewijzigd") || !update.output.includes("components/ui/chip.tsx")) fail(`het gewijzigde bestand van het project is niet gemeld als overgeslagen:\n${update.output}`);
console.log("  update geslaagd, met de melding over het gewijzigde bestand");

console.log("\n4. De uitkomst");
if (!readFileSync(join(project, "lib", "integrations", "http.ts"), "utf8").includes(MARK_NEW)) fail("lib/integrations/http.ts is niet bijgewerkt");
if (!readFileSync(join(project, "components", "ui", "chip.tsx"), "utf8").includes(MARK_LOCAL)) fail("components/ui/chip.tsx van het project is overschreven");
const lock = JSON.parse(readFileSync(join(project, "template.lock.json"), "utf8"));
if (lock.version !== next) fail(`de lock zegt ${lock.version} in plaats van ${next}`);
if (JSON.parse(readFileSync(join(project, "template", "manifest.json"), "utf8")).version !== next) fail("de tooling van het project is niet meegekomen met de nieuwe versie");
console.log(`  owned bijgewerkt, eigen wijziging bewaard, lock en tooling op ${next}`);

console.log("\n5. verify wijst het gewijzigde bestand aan, adopt lost het op");
const verifyBefore = tooling(project, project, ["verify"]);
if (verifyBefore.status === 0 || !verifyBefore.output.includes("components/ui/chip.tsx")) fail(`verify had components/ui/chip.tsx moeten noemen:\n${verifyBefore.output}`);
const adopt = tooling(project, project, ["adopt", "components/ui/chip.tsx"]);
if (adopt.status !== 0) fail(`adopt mislukte:\n${adopt.output}`);
const verifyAfter = tooling(project, project, ["verify"]);
if (verifyAfter.status !== 0) fail(`verify na adopt is niet schoon:\n${verifyAfter.output}`);
if (!readFileSync(join(project, "components", "ui", "chip.tsx"), "utf8").startsWith("/* template-adopted (module core)")) fail("het overgenomen bestand draagt de kop template-adopted niet");
console.log("  verify meldde het, adopt nam het over, verify is schoon");

console.log("\n6. Een tweede update verandert niets meer");
git(["add", "-A"]);
git(["-c", "user.name=update", "-c", "user.email=update@voorbeeld.invalid", "commit", "--quiet", "-m", "Na update"]);
const again = tooling(project, project, ["update", "--from", newer]);
if (again.status !== 0) fail(`de tweede update gaf exitcode ${again.status}:\n${again.output}`);
const status = spawnSync("git", ["status", "--porcelain"], { cwd: project, encoding: "utf8" }).stdout.trim();
if (status !== "") fail(`de tweede update liet een diff achter:\n${status}`);
console.log("  idempotent");

console.log("\nUpdatetest geslaagd.");
if (keep) console.log(`De mappen staan nog: ${base}`);
else rmSync(base, { recursive: true, force: true });
