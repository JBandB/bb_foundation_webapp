/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De hygiëneregel van het template zelf: geen projectinhoud, geen namen van eerdere projecten, van
 * de organisatie achter het template of van klanten, en geen em-dashes. Draait alleen in de repo van
 * het template (template-ci.yml); een project heeft hier niets aan.
 *
 * De verboden woorden staan in template/ci/forbidden-words.txt, één per regel, zodat de lijst zelf
 * niet in de code hoeft te staan. template/README.md en dat bestand zijn uitgezonderd: daar wordt
 * uitgelegd waarom de regel bestaat.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const root = process.cwd();
const WORDS_FILE = join(root, "template", "ci", "forbidden-words.txt");
const EXEMPT = new Set(["template/README.md", "template/ci/forbidden-words.txt", "template/ci/check-template.mjs"]);
const SKIPPED_DIRS = new Set(["node_modules", ".next", ".git", ".vercel", ".template-backup", "coverage", "playwright-report", "test-results", "fonts"]);
const TEXT_EXTENSIONS = new Set([".ts", ".tsx", ".mts", ".mjs", ".cjs", ".js", ".json", ".md", ".css", ".sql", ".yml", ".yaml", ".txt", ".html", ".svg"]);

const words = existsSync(WORDS_FILE)
  ? readFileSync(WORDS_FILE, "utf8")
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line !== "" && !line.startsWith("#"))
  : [];

function walk(dir, found = []) {
  for (const name of readdirSync(dir)) {
    if (SKIPPED_DIRS.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) walk(full, found);
    else found.push(full);
  }
  return found;
}

/* Als codepunt en niet als teken, anders weigert de ESLint-regel tegen em-dashes dit bestand zelf. */
const EM_DASH = String.fromCodePoint(0x2014);

const problems = [];
for (const file of walk(root)) {
  const rel = relative(root, file).split(sep).join("/");
  if (EXEMPT.has(rel)) continue;
  const extension = rel.slice(rel.lastIndexOf(".")).toLowerCase();
  if (!TEXT_EXTENSIONS.has(extension) && !rel.split("/").pop().startsWith(".")) continue;
  const text = readFileSync(file, "utf8");
  const lines = text.split("\n");
  lines.forEach((line, index) => {
    if (line.includes(EM_DASH)) problems.push(`${rel}:${index + 1} em-dash`);
    for (const word of words) {
      if (line.toLowerCase().includes(word.toLowerCase())) problems.push(`${rel}:${index + 1} bevat "${word}"`);
    }
  });
}

if (words.length === 0) console.log("Let op: template/ci/forbidden-words.txt ontbreekt of is leeg; alleen em-dashes gecontroleerd.");
if (problems.length > 0) {
  console.error(`Template-hygiëne: ${problems.length} probleem(en).\n`);
  for (const problem of problems) console.error(`  ${problem}`);
  process.exit(1);
}
console.log("Template-hygiëne: schoon. Geen verboden woorden en geen em-dashes.");
