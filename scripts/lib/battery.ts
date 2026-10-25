/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De batterij van `pnpm check:all`, puur: welke stappen er zijn, in welke volgorde, en hoe elke stap
 * als argumentenlijst voor `node` wordt uitgevoerd. Het draaien zelf staat in scripts/check-all.ts.
 *
 * **Rechtstreeks, nooit genest.** Een script in package.json dat zelf `pnpm` aanroept, breekt op een
 * Windows-gebruikerspad met een `&` erin. Daarom leest deze module de opdrachtregel van elk script en
 * zet hem om naar `node <bestand> <argumenten>`: `node ...` blijft zoals hij is, en de vier binaries
 * die de batterij gebruikt (`tsc`, `eslint`, `vitest`, `next`) worden het bestand in node_modules.
 * Een regel die zo niet uit te voeren is, wordt een probleem en geen stille overslag.
 *
 * **Goedkoopste eerst**, zoals de standaard: typecheck, lint, unittests, geheimen, migraties, drift,
 * contrast, het template, de build; dan pas wat een database vraagt: migraties heen en terug, elke
 * `check:<domein>`, en de e2e tegen `next start`.
 */

export interface Step {
  /** De naam van het script in package.json. */
  readonly name: string;
  /** Eén of meer opdrachten, elk als argumenten voor `node`; ze lopen na elkaar zoals `&&`. */
  readonly commands: readonly (readonly string[])[];
  readonly needsDatabase: boolean;
}

/** De stappen zonder database, in deze volgorde. Ontbreekt er een in package.json, dan is dat een probleem. */
export const OFFLINE_STEPS = ["typecheck", "lint", "test", "check:secrets", "check:migrations", "check:drift", "check:contrast", "template:verify", "build"] as const;

/** Checks die geen database vragen, en dus niet bij de databasestappen horen. */
const OFFLINE_CHECKS = new Set<string>(["check:secrets", "check:migrations", "check:drift", "check:contrast", "check:all"]);

/** De binaries die de batterij gebruikt, als bestand dat `node` kan draaien. */
const BINARIES: Readonly<Record<string, string>> = {
  tsc: "node_modules/typescript/bin/tsc",
  eslint: "node_modules/eslint/bin/eslint.js",
  vitest: "node_modules/vitest/vitest.mjs",
  next: "node_modules/next/dist/bin/next",
};

/** Een opdrachtregel als woorden, met dubbele aanhalingstekens voor een woord met spaties of sterren. */
export function words(command: string): string[] {
  const out: string[] = [];
  let current = "";
  let quoted = false;
  let started = false;
  for (const char of command.trim()) {
    if (char === '"') {
      quoted = !quoted;
      started = true;
    } else if (/\s/.test(char) && !quoted) {
      if (started) out.push(current);
      current = "";
      started = false;
    } else {
      current += char;
      started = true;
    }
  }
  if (started) out.push(current);
  return out;
}

/** Een scriptregel als opdrachten voor `node`, of de reden waarom dat niet kan. */
export function toNodeCommands(script: string): { ok: true; commands: string[][] } | { ok: false; reason: string } {
  const commands: string[][] = [];
  for (const part of script.split("&&")) {
    const [first, ...rest] = words(part);
    if (first === undefined) return { ok: false, reason: "lege opdracht" };
    if (first === "node") {
      commands.push(rest);
      continue;
    }
    const binary = BINARIES[first];
    if (binary === undefined) return { ok: false, reason: `"${first}" is niet rechtstreeks met node uit te voeren` };
    commands.push([binary, ...rest]);
  }
  return { ok: true, commands };
}

/** De stappen uit de scripts van package.json, in de volgorde van de batterij. */
export function planBattery(scripts: Readonly<Record<string, string>>): { steps: Step[]; problems: string[] } {
  const steps: Step[] = [];
  const problems: string[] = [];
  const add = (name: string, needsDatabase: boolean) => {
    const script = scripts[name];
    if (script === undefined) {
      problems.push(`${name} ontbreekt in package.json`);
      return;
    }
    const parsed = toNodeCommands(script);
    if (parsed.ok) steps.push({ name, commands: parsed.commands, needsDatabase });
    else problems.push(`${name}: ${parsed.reason}`);
  };

  for (const name of OFFLINE_STEPS) add(name, false);
  add("db:roundtrip", true);
  const domainChecks = Object.keys(scripts)
    .filter((name) => name.startsWith("check:") && !OFFLINE_CHECKS.has(name))
    .sort((a, b) => (a === "check:core" ? -1 : b === "check:core" ? 1 : a.localeCompare(b)));
  for (const name of domainChecks) add(name, true);
  add("e2e", true);
  return { steps, problems };
}

export type Outcome = "ok" | "failed" | "skipped";

export interface Result {
  readonly name: string;
  readonly outcome: Outcome;
  readonly seconds: number;
  readonly note?: string;
}

/** De samenvatting als tabel voor de rubriek Bewijs, en de exitcode: 1 bij een fout, 2 als er iets is overgeslagen. */
export function summarise(results: readonly Result[]): { lines: string[]; exitCode: 0 | 1 | 2 } {
  const word: Readonly<Record<Outcome, string>> = { ok: "groen", failed: "ROOD", skipped: "overgeslagen" };
  const lines = ["| Stap | Uitkomst | Duur |", "|---|---|---|"];
  for (const result of results) {
    lines.push(`| \`pnpm ${result.name}\` | ${word[result.outcome]}${result.note === undefined ? "" : ` (${result.note})`} | ${result.seconds.toFixed(1)} s |`);
  }
  const failed = results.filter((result) => result.outcome === "failed").length;
  const skipped = results.filter((result) => result.outcome === "skipped").length;
  lines.push("");
  if (failed > 0) lines.push(`${failed} ${failed === 1 ? "stap is" : "stappen zijn"} rood.`);
  else if (skipped > 0) lines.push(`Alles wat draaide is groen, maar ${skipped} ${skipped === 1 ? "stap is" : "stappen zijn"} overgeslagen: dat is geen groen voor de Definition of done.`);
  else lines.push("De hele batterij is groen.");
  return { lines, exitCode: failed > 0 ? 1 : skipped > 0 ? 2 : 0 };
}
