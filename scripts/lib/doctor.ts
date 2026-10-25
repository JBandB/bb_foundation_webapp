/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het oordeel van `pnpm doctor`, puur: de feiten van de werkmap erin, een lijst bevindingen eruit. Het
 * verzamelen staat in scripts/doctor.ts; hier staat alleen wat de feiten betekenen, zodat elke regel
 * los te testen is.
 *
 * Drie niveaus. ACTIE: zo werkt het niet, los dit eerst op. LATER: nog niet nodig, wel zodra je de
 * handleiding erbij doet. OK: klopt. Er komt nooit een waarde van een variabele in beeld, alleen de
 * naam, en van de database alleen het endpoint-id, net als bij elk ander script.
 */

export type DoctorLevel = "ok" | "action" | "later";

export interface Finding {
  readonly level: DoctorLevel;
  readonly text: string;
  /** Wat je doet, bij ACTIE en LATER. */
  readonly fix?: string;
}

export interface ModuleEnv {
  readonly module: string;
  readonly name: string;
  readonly where: "local" | "vercel" | "both";
  readonly secret: boolean;
  readonly guide: string;
}

export interface GitFacts {
  readonly userName: string;
  readonly userEmail: string;
  readonly hooksPath: string;
  readonly branch: string;
}

export interface DoctorFacts {
  readonly nodeVersion: string;
  /** `engines.node` uit package.json, zoals "24.x". */
  readonly nodeEngine: string | undefined;
  /** De versie uit `npm_config_user_agent`, als het script via pnpm draait. */
  readonly pnpmVersion: string | undefined;
  /** `packageManager` uit package.json, zoals "pnpm@11.20.0". */
  readonly packageManager: string | undefined;
  readonly lock: { readonly version: string; readonly modules: readonly string[] } | undefined;
  /** De modules uit project.config.json; undefined als het bestand ontbreekt of niet te lezen is. */
  readonly configModules: readonly string[] | undefined;
  readonly envLocal: "missing" | "present" | "tracked";
  readonly env: Readonly<Record<string, string | undefined>>;
  /** De variabelen van de toegepaste modules, uit het manifest. */
  readonly envVars: readonly ModuleEnv[];
  /** De endpoint-id's uit DATABASE_URL en DATABASE_URL_UNPOOLED; "invalid" als de string niet te lezen is. */
  readonly endpoints: { readonly pooled: string | undefined; readonly direct: string | undefined };
  readonly vercelLinked: boolean;
  /** undefined: geen git, of geen git-werkmap. */
  readonly git: GitFacts | undefined;
}

export const INVALID_ENDPOINT = "invalid";

const major = (version: string) => version.replace(/^v/, "").split(".")[0] ?? "";

function has(env: DoctorFacts["env"], name: string): boolean {
  const value = env[name];
  return value !== undefined && value.trim() !== "";
}

function node(facts: DoctorFacts): Finding {
  const wanted = facts.nodeEngine?.replace(/\.x$/, "");
  if (wanted === undefined || major(facts.nodeVersion) === wanted) {
    return { level: "ok", text: `Node ${facts.nodeVersion}${facts.nodeEngine === undefined ? "" : ` (vereist ${facts.nodeEngine})`}` };
  }
  return { level: "action", text: `Node ${facts.nodeVersion}, het project vraagt ${facts.nodeEngine}`, fix: `Installeer Node ${wanted} (LTS) en open een nieuwe terminal.` };
}

function pnpm(facts: DoctorFacts): Finding | undefined {
  const wanted = facts.packageManager?.match(/^pnpm@(\d+[\d.]*)/)?.[1];
  if (wanted === undefined || facts.pnpmVersion === undefined) return undefined;
  if (major(facts.pnpmVersion) === major(wanted)) return { level: "ok", text: `pnpm ${facts.pnpmVersion}` };
  return { level: "action", text: `pnpm ${facts.pnpmVersion}, het project vraagt ${wanted}`, fix: `Zet Corepack aan met corepack enable, of installeer pnpm ${wanted}.` };
}

function template(facts: DoctorFacts): Finding[] {
  if (facts.lock === undefined) return [{ level: "action", text: "Er is geen template.lock.json", fix: "pnpm template:apply" }];
  const found: Finding[] = [{ level: "ok", text: `Template v${facts.lock.version}, modules: ${facts.lock.modules.join(", ")}` }];
  if (facts.configModules === undefined) {
    found.push({ level: "action", text: "project.config.json ontbreekt of is niet te lezen", fix: "pnpm template:validate laat zien wat er mis is." });
    return found;
  }
  const applied = facts.lock.modules.filter((module) => module !== "core");
  const missing = facts.configModules.filter((module) => !applied.includes(module));
  const extra = applied.filter((module) => !facts.configModules?.includes(module));
  if (missing.length > 0 || extra.length > 0) {
    const parts = [missing.length > 0 ? `nog niet toegepast: ${missing.join(", ")}` : "", extra.length > 0 ? `niet meer in de configuratie: ${extra.join(", ")}` : ""].filter((part) => part !== "");
    found.push({ level: "action", text: `project.config.json en template.lock.json noemen andere modules (${parts.join("; ")})`, fix: "pnpm template:apply, en daarna pnpm install." });
  }
  return found;
}

function envLocal(facts: DoctorFacts): Finding[] {
  if (facts.envLocal === "tracked") {
    return [{ level: "action", text: ".env.local staat in git", fix: "git rm --cached .env.local, en wissel de geheimen die erin stonden (handleiding 06)." }];
  }
  if (facts.envLocal === "missing") {
    return [{ level: "action", text: "Er is geen .env.local", fix: "vercel env pull .env.local en vul hem aan volgens handleiding 07." }];
  }

  const local = facts.envVars.filter((variable) => variable.where !== "vercel");
  const missing = local.filter((variable) => !has(facts.env, variable.name));
  const found: Finding[] = [{ level: "ok", text: `.env.local: ${local.length - missing.length} van de ${local.length} variabelen staan erin` }];
  for (const variable of missing) {
    const sensitive = variable.secret ? " Een Sensitive waarde komt niet mee met vercel env pull; zet hem zelf." : "";
    found.push({
      level: variable.module === "core" ? "action" : "later",
      text: `${variable.name} ontbreekt in .env.local${variable.module === "core" ? "" : ` (module ${variable.module})`}`,
      fix: `Zie ${variable.guide}.${sensitive}`,
    });
  }
  return found;
}

/**
 * De dev-login start alleen met `APP_ENV=local`. Ontbreekt APP_ENV, dan meldt `envLocal` dat al; hier
 * alleen het geval dat hij er staat met een andere waarde, want dan start de app lokaal niet.
 */
function devLogin(facts: DoctorFacts): Finding[] {
  const appEnv = (facts.env.APP_ENV ?? "").trim();
  if (facts.env.AUTH_DEV_LOGIN !== "1" || appEnv === "" || appEnv === "local") return [];
  return [{ level: "action", text: `AUTH_DEV_LOGIN staat aan, maar APP_ENV is ${appEnv}: de app start dan niet`, fix: "Zet APP_ENV=local in .env.local (handleiding 07)." }];
}

function database(facts: DoctorFacts): Finding[] {
  const { pooled, direct } = facts.endpoints;
  const endpoint = direct ?? pooled;
  if (endpoint === undefined) return [];
  if (pooled === INVALID_ENDPOINT || direct === INVALID_ENDPOINT) {
    return [{ level: "action", text: "DATABASE_URL of DATABASE_URL_UNPOOLED is geen geldige verbindingsstring", fix: "Kopieer ze opnieuw uit Neon, van de branch dev (handleiding 04)." }];
  }
  if (pooled !== undefined && direct !== undefined && pooled !== direct) {
    return [{ level: "action", text: `DATABASE_URL (${pooled}) en DATABASE_URL_UNPOOLED (${direct}) wijzen naar verschillende branches`, fix: "Neem beide van de branch dev in Neon (handleiding 07)." }];
  }
  const production = facts.env.PRODUCTION_DB_ENDPOINT;
  if (production !== undefined && production !== "" && production === endpoint) {
    return [{ level: "action", text: `De database in .env.local is productie (${endpoint})`, fix: "Lokaal werk je tegen de branch dev: zet de verbindingsstrings van dev in .env.local (handleiding 07)." }];
  }
  const seedTarget = facts.env.SEED_TARGET;
  if (seedTarget === undefined || seedTarget === "") return [{ level: "ok", text: `Database: endpoint ${endpoint}` }];
  if (seedTarget !== endpoint) {
    return [{ level: "action", text: `SEED_TARGET (${seedTarget}) is niet het endpoint uit DATABASE_URL (${endpoint})`, fix: "Controleer met pnpm db:status welke branch dit is, en zet SEED_TARGET op het endpoint van dev." }];
  }
  return [{ level: "ok", text: `Database: endpoint ${endpoint}, gelijk aan SEED_TARGET` }];
}

function vercel(facts: DoctorFacts): Finding {
  if (facts.vercelLinked) return { level: "ok", text: "De werkmap is gekoppeld aan een Vercel-project" };
  return { level: "later", text: "De werkmap is nog niet gekoppeld aan Vercel", fix: "vercel link, en daarna vercel env pull .env.local (handleiding 07)." };
}

function git(facts: DoctorFacts): Finding[] {
  if (facts.git === undefined) return [{ level: "action", text: "Dit is geen git-werkmap, of git ontbreekt", fix: "Kloon de repo met git (handleiding 02)." }];
  const found: Finding[] = [];
  if (facts.git.userName === "" || facts.git.userEmail === "") {
    found.push({ level: "action", text: "Git weet niet wie je bent", fix: 'git config --global user.name "Je naam" en git config --global user.email met je adres van de organisatie.' });
  } else {
    found.push({ level: "ok", text: `Git: ${facts.git.userName}` });
  }
  if (facts.git.hooksPath !== ".githooks") found.push({ level: "action", text: "De commit-hook staat uit", fix: "pnpm setup:hooks" });
  if (facts.git.branch === "main") {
    found.push({ level: "later", text: "Je staat op main", fix: "Een ronde begint op release/next (handleiding 09)." });
  } else if (facts.git.branch !== "") {
    found.push({ level: "ok", text: `Branch ${facts.git.branch}` });
  }
  return found;
}

/** Alle bevindingen, in de volgorde waarin je ze oplost: eerst de machine, dan het template, dan de omgeving. */
export function diagnose(facts: DoctorFacts): Finding[] {
  const pnpmFinding = pnpm(facts);
  return [node(facts), ...(pnpmFinding === undefined ? [] : [pnpmFinding]), ...git(facts), ...template(facts), ...envLocal(facts), ...devLogin(facts), ...database(facts), vercel(facts)];
}

const TAGS: Readonly<Record<DoctorLevel, string>> = { ok: "[OK]   ", action: "[ACTIE]", later: "[LATER]" };

/** De regels voor de terminal, met de oplossing ingesprongen eronder. */
export function formatFindings(findings: readonly Finding[]): string[] {
  const lines = findings.flatMap((finding) => [`${TAGS[finding.level]} ${finding.text}`, ...(finding.fix === undefined ? [] : [`        ${finding.fix}`])]);
  const actions = findings.filter((finding) => finding.level === "action").length;
  lines.push("");
  lines.push(actions === 0 ? "Geen acties. Voor de database zelf: pnpm db:status." : `${actions} ${actions === 1 ? "actie" : "acties"}. Los ze van boven naar beneden op en draai pnpm doctor opnieuw.`);
  return lines;
}
