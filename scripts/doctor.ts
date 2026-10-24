/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm doctor`: klopt deze werkmap? Node en pnpm, git en de commit-hook, het template en de modules,
 * `.env.local` met de variabelen van elke toegepaste module, de database tegen SEED_TARGET, en de
 * koppeling met Vercel. Raakt geen database en geen dienst buiten de machine: voor de database zelf is
 * er pnpm db:status.
 *
 * Exitcode 1 als er iets op ACTIE staat, zodat een wizard of een ander script erop kan wachten.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { describeTarget } from "./lib/connection";
import { diagnose, formatFindings, INVALID_ENDPOINT, type DoctorFacts, type GitFacts, type ModuleEnv } from "./lib/doctor";
import { runScript } from "./lib/run";

function readJson(path: string): unknown {
  if (!existsSync(path)) return undefined;
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return undefined;
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
const asString = (value: unknown): string | undefined => (typeof value === "string" ? value : undefined);
const asStrings = (value: unknown): string[] | undefined => (Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : undefined);

function git(args: readonly string[]): string | undefined {
  try {
    return execFileSync("git", args, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
  } catch {
    return undefined;
  }
}

function gitFacts(): GitFacts | undefined {
  if (git(["rev-parse", "--is-inside-work-tree"]) !== "true") return undefined;
  return {
    userName: git(["config", "user.name"]) ?? "",
    userEmail: git(["config", "user.email"]) ?? "",
    hooksPath: git(["config", "core.hooksPath"]) ?? "",
    branch: git(["rev-parse", "--abbrev-ref", "HEAD"]) ?? "",
  };
}

function endpoint(name: string): string | undefined {
  const url = process.env[name];
  if (url === undefined || url.trim() === "") return undefined;
  try {
    return describeTarget(url);
  } catch {
    return INVALID_ENDPOINT;
  }
}

/**
 * De toegepaste modules volgens de lock. `modules` noemt alleen de modules met een databaseschema;
 * elk bestand noemt zijn module, dus samen geven ze de volledige lijst, met core vooraan.
 */
function lockedModules(lock: Record<string, unknown>): string[] {
  const names = new Set<string>(["core"]);
  if (isRecord(lock.modules)) for (const name of Object.keys(lock.modules)) names.add(name);
  if (isRecord(lock.files)) {
    for (const file of Object.values(lock.files)) {
      if (isRecord(file) && typeof file.module === "string") names.add(file.module);
    }
  }
  return [...names];
}

/** De variabelen van de toegepaste modules, uit het manifest in template/. */
function envVars(manifest: unknown, modules: readonly string[]): ModuleEnv[] {
  if (!isRecord(manifest) || !isRecord(manifest.modules)) return [];
  const all = manifest.modules;
  return modules.flatMap((module) => {
    const entry = all[module];
    if (!isRecord(entry) || !Array.isArray(entry.env)) return [];
    return entry.env.flatMap((variable): ModuleEnv[] => {
      if (!isRecord(variable)) return [];
      const name = asString(variable.name);
      const where = asString(variable.where);
      if (name === undefined || (where !== "local" && where !== "vercel" && where !== "both")) return [];
      return [{ module, name, where, secret: variable.secret === true, guide: asString(variable.guide) ?? "docs/handleiding/06-variabelen-in-vercel.md" }];
    });
  });
}

runScript(async () => {
  const pkg = readJson("package.json");
  const lockJson = readJson("template.lock.json");
  const config = readJson("project.config.json");

  const lock = isRecord(lockJson) && typeof lockJson.version === "string" ? { version: lockJson.version, modules: lockedModules(lockJson) } : undefined;
  const tracked = git(["ls-files", "--", ".env.local"]);

  const facts: DoctorFacts = {
    nodeVersion: process.versions.node,
    nodeEngine: isRecord(pkg) && isRecord(pkg.engines) ? asString(pkg.engines.node) : undefined,
    pnpmVersion: process.env.npm_config_user_agent?.match(/pnpm\/(\d+[\d.]*)/)?.[1],
    packageManager: isRecord(pkg) ? asString(pkg.packageManager) : undefined,
    lock,
    configModules: isRecord(config) ? asStrings(config.modules) : undefined,
    envLocal: tracked !== undefined && tracked !== "" ? "tracked" : existsSync(".env.local") ? "present" : "missing",
    env: process.env,
    envVars: envVars(readJson("template/manifest.json"), lock?.modules ?? ["core"]),
    endpoints: { pooled: endpoint("DATABASE_URL"), direct: endpoint("DATABASE_URL_UNPOOLED") },
    vercelLinked: existsSync(".vercel/project.json"),
    git: gitFacts(),
  };

  const findings = diagnose(facts);
  console.log("pnpm doctor: de stand van deze werkmap\n");
  for (const line of formatFindings(findings)) console.log(line);
  if (findings.some((finding) => finding.level === "action")) process.exitCode = 1;
});
