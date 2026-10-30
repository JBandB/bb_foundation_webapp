/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { diagnose, formatFindings, INVALID_ENDPOINT, type DoctorFacts, type Finding } from "./doctor";

const GOOD: DoctorFacts = {
  nodeVersion: "24.11.0",
  nodeEngine: "24.x",
  pnpmVersion: "11.20.0",
  packageManager: "pnpm@11.20.0",
  lock: { version: "1.2.0", modules: ["core", "auth-password", "ai"] },
  configModules: ["auth-password", "ai"],
  envLocal: "present",
  env: { DATABASE_URL: "x", DATABASE_URL_UNPOOLED: "x", AUTH_SECRET: "x", SEED_TARGET: "ep-dev-1", ANTHROPIC_API_KEY: "x" },
  envVars: [
    { module: "core", name: "DATABASE_URL", where: "both", secret: true, guide: "docs/handleiding/04-neon.md" },
    { module: "core", name: "DATABASE_URL_UNPOOLED", where: "both", secret: true, guide: "docs/handleiding/04-neon.md" },
    { module: "core", name: "AUTH_SECRET", where: "both", secret: true, guide: "docs/handleiding/06-variabelen-in-vercel.md" },
    { module: "core", name: "SEED_TARGET", where: "local", secret: false, guide: "docs/handleiding/07-lokaal-werken.md" },
    { module: "core", name: "CRON_SECRET", where: "vercel", secret: true, guide: "docs/handleiding/23-crons-en-taken.md" },
    { module: "ai", name: "ANTHROPIC_API_KEY", where: "both", secret: true, guide: "docs/handleiding/24-claude-api.md" },
  ],
  endpoints: { pooled: "ep-dev-1", direct: "ep-dev-1", app: "ep-dev-1" },
  vercelLinked: true,
  git: { userName: "Tester", userEmail: "tester@example.org", hooksPath: ".githooks", branch: "release/next" },
};

const levels = (findings: readonly Finding[], level: Finding["level"]) => findings.filter((finding) => finding.level === level).map((finding) => finding.text);

describe("pnpm doctor", () => {
  it("vindt niets op een werkmap die klopt, en vraagt geen variabele die alleen in Vercel staat", () => {
    const findings = diagnose(GOOD);
    expect(levels(findings, "action")).toEqual([]);
    expect(levels(findings, "later")).toEqual([]);
    expect(findings.some((finding) => finding.text.includes("CRON_SECRET"))).toBe(false);
    expect(formatFindings(findings).at(-1)).toContain("Geen acties");
  });

  it("vraagt de juiste Node en pnpm", () => {
    const findings = diagnose({ ...GOOD, nodeVersion: "22.4.0", pnpmVersion: "9.1.0" });
    expect(levels(findings, "action")).toEqual(["Node 22.4.0, het project vraagt 24.x", "pnpm 9.1.0, het project vraagt 11.20.0"]);
  });

  it("slaat pnpm over als het script niet via pnpm draait", () => {
    expect(diagnose({ ...GOOD, pnpmVersion: undefined }).some((finding) => finding.text.startsWith("pnpm"))).toBe(false);
  });

  it("ziet een module in de configuratie die nog niet is toegepast", () => {
    const findings = diagnose({ ...GOOD, configModules: ["auth-password", "ai", "files"] });
    expect(levels(findings, "action")).toEqual(["project.config.json en template.lock.json noemen andere modules (nog niet toegepast: files)"]);
  });

  it("zonder lock is apply de eerste actie", () => {
    expect(diagnose({ ...GOOD, lock: undefined }).find((finding) => finding.level === "action")?.fix).toBe("pnpm template:apply");
  });

  it("een ontbrekende variabele van core is een actie, van een module later, met de handleiding", () => {
    const findings = diagnose({ ...GOOD, env: { ...GOOD.env, AUTH_SECRET: "", ANTHROPIC_API_KEY: undefined } });
    expect(levels(findings, "action")).toEqual(["AUTH_SECRET ontbreekt in .env.local"]);
    const later = findings.find((finding) => finding.level === "later");
    expect(later?.text).toBe("ANTHROPIC_API_KEY ontbreekt in .env.local (module ai)");
    expect(later?.fix).toContain("docs/handleiding/24-claude-api.md");
    expect(later?.fix).toContain("Sensitive");
  });

  it("zonder .env.local, of met .env.local in git, is dat de actie", () => {
    expect(levels(diagnose({ ...GOOD, envLocal: "missing" }), "action")).toEqual(["Er is geen .env.local"]);
    expect(levels(diagnose({ ...GOOD, envLocal: "tracked" }), "action")).toEqual([".env.local staat in git"]);
  });

  it("de database: verschillende branches, productie, SEED_TARGET ernaast of een kapotte string", () => {
    expect(levels(diagnose({ ...GOOD, endpoints: { pooled: "ep-dev-1", direct: "ep-main-2", app: undefined } }), "action")[0]).toContain("verschillende branches");
    expect(levels(diagnose({ ...GOOD, env: { ...GOOD.env, PRODUCTION_DB_ENDPOINT: "ep-dev-1" } }), "action")[0]).toContain("is productie");
    expect(levels(diagnose({ ...GOOD, env: { ...GOOD.env, SEED_TARGET: "ep-other-3" } }), "action")[0]).toContain("SEED_TARGET (ep-other-3)");
    expect(levels(diagnose({ ...GOOD, endpoints: { pooled: INVALID_ENDPOINT, direct: "ep-dev-1", app: undefined } }), "action")[0]).toContain("geen geldige");
  });

  it("git: wie je bent en de hook zijn acties, op main staan is later", () => {
    const findings = diagnose({ ...GOOD, git: { userName: "", userEmail: "", hooksPath: "", branch: "main" } });
    expect(levels(findings, "action")).toEqual(["Git weet niet wie je bent", "De commit-hook staat uit"]);
    expect(levels(findings, "later")).toEqual(["Je staat op main"]);
    expect(levels(diagnose({ ...GOOD, git: undefined }), "action")).toEqual(["Dit is geen git-werkmap, of git ontbreekt"]);
  });

  it("de rol van de app: zonder is later, op een andere branch een actie, en de eigenaar hoort lokaal niet", () => {
    expect(levels(diagnose({ ...GOOD, endpoints: { ...GOOD.endpoints, app: undefined } }), "later")).toEqual(["De app werkt lokaal als eigenaar van de database (geen DATABASE_URL_APP)"]);
    expect(levels(diagnose(GOOD), "later")).toEqual([]);
    expect(levels(diagnose({ ...GOOD, endpoints: { ...GOOD.endpoints, app: "ep-main-2" } }), "action")[0]).toContain("DATABASE_URL_APP (ep-main-2)");
    expect(levels(diagnose({ ...GOOD, endpoints: { ...GOOD.endpoints, app: INVALID_ENDPOINT } }), "action")[0]).toContain("DATABASE_URL_APP is geen geldige");
    expect(levels(diagnose({ ...GOOD, env: { ...GOOD.env, DATABASE_URL_OWNER: "x" } }), "later")).toContain("DATABASE_URL_OWNER staat in .env.local, maar telt alleen in productie");
  });

  it("de dev-login met een andere APP_ENV dan local is een actie", () => {
    expect(levels(diagnose({ ...GOOD, env: { ...GOOD.env, AUTH_DEV_LOGIN: "1", APP_ENV: "production" } }), "action")).toEqual(["AUTH_DEV_LOGIN staat aan, maar APP_ENV is production: de app start dan niet"]);
    expect(levels(diagnose({ ...GOOD, env: { ...GOOD.env, AUTH_DEV_LOGIN: "1", APP_ENV: "local" } }), "action")).toEqual([]);
  });

  it("toont nooit de waarde van een variabele", () => {
    const secret = "sk-ant-geheim-123";
    const lines = formatFindings(diagnose({ ...GOOD, env: { ...GOOD.env, ANTHROPIC_API_KEY: secret, AUTH_SECRET: undefined } }));
    expect(lines.join("\n")).not.toContain(secret);
  });
});
