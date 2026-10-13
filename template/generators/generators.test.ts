/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { normaliseConfig } from "../lib/config";
import type { ProjectConfig } from "../lib/config-schema";
import { readHeader } from "../lib/header";
import { appliedModules, loadManifest } from "../lib/manifest";
import { generateAll } from "./index";
import { failingPairs } from "./palette";
import { generateTheme } from "./theme";

const root = process.cwd();
const manifest = loadManifest(root);

function example(name: string): ProjectConfig {
  const raw: unknown = JSON.parse(readFileSync(join(root, "examples", `${name}.project.config.json`), "utf8"));
  const report = normaliseConfig(raw, manifest);
  if (report.config === undefined) throw new Error(`${name}: ${JSON.stringify(report.errors)}`);
  return report.config;
}

describe("het thema uit de drie voorbeeldconfiguraties", () => {
  it.each(["default", "voorbeeld", "minimaal"])("%s haalt elk contrastpaar in elke modus", (name) => {
    const theme = generateTheme(example(name));
    expect(failingPairs(theme.light)).toEqual([]);
    if (theme.dark !== undefined) expect(failingPairs(theme.dark)).toEqual([]);
    expect(theme.css).toContain("/* ---------- 1. Constanten");
    expect(theme.css).toContain("/* ---------- 2. Licht");
    expect(theme.css).toContain("/* ---------- 3. Donker");
    expect(readHeader(theme.css)).toEqual({ kind: "generated", generator: "theme" });
  });

  it("laat het donkere blok weg als de donkere modus uit staat", () => {
    const theme = generateTheme(example("minimaal"));
    expect(theme.dark).toBeUndefined();
    expect(theme.css).toContain("/* dark mode: off */");
    expect(theme.css).not.toContain(".dark {");
  });

  it("maakt van een lastige primaire kleur een knop waar witte tekst op leesbaar is, met dezelfde tint", () => {
    const theme = generateTheme(example("voorbeeld"));
    expect(theme.light.primary).not.toBe("#e07b00");
    expect(theme.light["primary-foreground"]).toBe("#ffffff");
  });

  it("volgt de afronding uit de configuratie", () => {
    expect(generateTheme(example("default")).css).toContain("--radius: 4px;");
    expect(generateTheme(example("voorbeeld")).css).toContain("--radius: 8px;");
  });
});

describe("de overige generatoren", () => {
  const config = example("voorbeeld");
  const files = generateAll(config, manifest);
  const content = (path: string): string => files.find((file) => file.path === path)?.content ?? "";

  it("schrijven PROJECT met de velden van de configuratie en niets uit hosting of intake", () => {
    const project = content("lib/project/config.generated.ts");
    expect(project).toContain('name: "Rooster De Weide"');
    expect(project).toContain('locale: "nl-NL"');
    expect(project).toContain('authProvider: "password"');
    expect(project).toContain('logo: { kind: "image", path: "public/brand/logo.svg", darkPath: "public/brand/logo-dark.svg" }');
    expect(project).not.toContain("de-weide/rooster");
    expect(project).not.toContain("Rooster en invallers");
  });

  it("schrijven de rollen met het label in de taal van het project", () => {
    const roles = content("lib/auth/roles.generated.ts");
    expect(roles).toContain('export const APP_ROLES = ["admin", "coordinator", "volunteer"] as const;');
    expect(roles).toContain('"coordinator": "Coördinator",');
    expect(roles).toContain('export const ADMIN_ROLES: readonly AppRole[] = ["admin"];');
    expect(content("lib/auth/roles.generated.ts").includes("Administrator")).toBe(false);
    expect(generateAll(example("minimaal"), manifest).find((file) => file.path === "lib/auth/roles.generated.ts")?.content).toContain('"admin": "Administrator"');
  });

  it("schrijven de schema-index met de bestanden van de toegepaste modules", () => {
    const index = content("lib/db/schema/template-index.ts");
    expect(index).toContain('export * from "./columns";');
    expect(index).toContain('export * from "./tool-feedback";');
  });

  it("schrijven de wachtwoordlogin in de registers van het voorbeeld, en Entra in die van de standaard", () => {
    expect(content("lib/project/registry.generated.ts")).toContain("export const LOGIN_PROVIDERS: readonly LoginProvider[] = [passwordLoginProvider];");
    expect(content("lib/project/registry.generated.ts")).toContain("export const NAV_ITEMS: readonly ModuleNavItem[] = [accountNavItem];");
    expect(content("lib/project/ui-registry.generated.ts")).toContain("export const LOGIN_BUTTONS: readonly ComponentType[] = [PasswordSignIn];");
    expect(content("lib/project/config.generated.ts")).toContain('password: { mfaRequiredFor: "admins" }');
    const standard = generateAll(example("default"), manifest);
    expect(standard.find((file) => file.path === "lib/project/registry.generated.ts")?.content).toContain("NAV_ITEMS: readonly ModuleNavItem[] = [];");
    expect(standard.find((file) => file.path === "lib/project/registry.generated.ts")?.content).toContain("[entraLoginProvider]");
    expect(standard.find((file) => file.path === "lib/project/ui-registry.generated.ts")?.content).toContain('import { EntraSignIn } from "@/components/login/entra-sign-in";');
  });

  it("schrijven de beheertabbladen en de teksten van de toegepaste modules, en niets voor de standaard", () => {
    /* In de volgorde van toepassen: jobs vóór messaging, want messaging vereist jobs. */
    expect(content("lib/project/registry.generated.ts")).toContain("export const ADMIN_TABS: readonly AdminTab[] = [jobsAdminTab, messagingAdminTab, accountsAdminTab];");
    expect(content("lib/project/registry.generated.ts")).toContain('import { jobsAdminTab } from "@/lib/jobs/admin-tab";');
    expect(content("lib/project/registry.generated.ts")).toContain("[jobsHealth, messagingHealth, filesHealth]");
    expect(content("lib/project/ui-registry.generated.ts")).toContain("export const LOGIN_EXTRAS: readonly ComponentType[] = [LoginHelp];");
    const moduleLabels = content("lib/i18n/template/modules.generated.ts");
    expect(moduleLabels).toContain('import { jobsLabels } from "@/lib/i18n/template/jobs";');
    expect(moduleLabels).toContain("  jobs: jobsLabels[PROJECT.uiLanguage],");
    expect(moduleLabels).toContain("  messaging: messagingLabels[PROJECT.uiLanguage],");

    const standard = generateAll(example("default"), manifest);
    expect(standard.find((file) => file.path === "lib/project/registry.generated.ts")?.content).toContain("ADMIN_TABS: readonly AdminTab[] = [];");
    expect(standard.find((file) => file.path === "lib/i18n/template/modules.generated.ts")?.content).toContain("export const moduleLabels = {\n} as const;");
  });

  it("geven elk bestand de kop van zijn generator", () => {
    for (const file of files) expect(readHeader(file.content), file.path).toEqual({ kind: "generated", generator: file.generator });
  });

  it("kennen de volgorde van toepassen", () => {
    expect(appliedModules(manifest, config.modules)).toEqual(["core", "jobs", "messaging", "auth-password", "files"]);
  });
});
