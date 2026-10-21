/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { authModuleFor, deriveLocale, normaliseConfig, parseConfig } from "./config";
import { isPlainObject } from "./dsl";
import { loadManifest } from "./manifest";

const root = process.cwd();
const manifest = loadManifest(root);

function example(name: string): Record<string, unknown> {
  const parsed: unknown = JSON.parse(readFileSync(join(root, "examples", `${name}.project.config.json`), "utf8"));
  if (!isPlainObject(parsed)) throw new Error("voorbeeld is geen object");
  return parsed;
}

/** Het standaardvoorbeeld met een aanpassing erin, voor de foutgevallen. */
function withPatch(patch: (config: Record<string, unknown>) => void): Record<string, unknown> {
  const config = example("default");
  patch(config);
  return config;
}

function section(config: Record<string, unknown>, name: string): Record<string, unknown> {
  const value = config[name];
  if (!isPlainObject(value)) throw new Error(`${name} is geen object`);
  return value;
}

function errorsOf(config: unknown): string[] {
  return normaliseConfig(config, manifest).errors.map((problem) => `${problem.path}: ${problem.message}`);
}

describe("de voorbeeldconfiguraties", () => {
  it.each(["default", "voorbeeld", "minimaal"])("%s is geldig", (name) => {
    const report = normaliseConfig(example(name), manifest);
    expect(report.errors).toEqual([]);
    expect(report.config).toBeDefined();
  });

  it("het standaardvoorbeeld geeft geen waarschuwingen", () => {
    expect(normaliseConfig(example("default"), manifest).warnings).toEqual([]);
  });

  it("normaliseren is een vast punt", () => {
    const once = normaliseConfig(example("voorbeeld"), manifest).config;
    expect(once).toBeDefined();
    const twice = normaliseConfig(once, manifest).config;
    expect(twice).toEqual(once);
  });
});

describe("afgeleide velden", () => {
  const minimal = normaliseConfig(example("minimaal"), manifest).config;

  it("leidt de korte naam, het systeemadres, de modules en de dev-accounts af", () => {
    expect(minimal?.project.shortName).toBe("Inventory");
    expect(minimal?.project.systemEmail).toBe("system@inventory.invalid");
    expect(minimal?.modules).toEqual(["auth-entra"]);
    expect(minimal?.auth.devUsers).toEqual([
      { email: "admin@dev.invalid", displayName: "Administrator (dev)", roles: ["admin"] },
      { email: "member@dev.invalid", displayName: "Member (dev)", roles: ["member"] },
    ]);
  });

  it("gebruikt het maildomein voor het systeemadres als dat er is", () => {
    const config = withPatch((raw) => {
      const project = section(raw, "project");
      delete project.systemEmail;
      project.organisation = { name: "Org", mailDomain: "Voorbeeld.NL" };
    });
    expect(normaliseConfig(config, manifest).config?.project.systemEmail).toBe("system@voorbeeld.nl");
  });

  it("kent de locale en de inlogmodule", () => {
    expect(deriveLocale("nl")).toBe("nl-NL");
    expect(deriveLocale("en")).toBe("en-GB");
    expect(authModuleFor("password")).toBe("auth-password");
  });
});

describe("fouten met het pad erbij", () => {
  it("een onbekend veld en een verkeerde slug", () => {
    expect(errorsOf(withPatch((raw) => section(raw, "project").slogan = "x"))).toEqual([
      "project.slogan: onbekend veld; bekende velden: name, shortName, slug, description, organisation, uiLanguage, timezone, currency, systemEmail, productionUrl, homePath",
    ]);
    expect(errorsOf(withPatch((raw) => section(raw, "project").slug = "Mijn Project"))).toEqual([
      "project.slug: kleine letters, cijfers en koppeltekens, beginnend met een letter, 2 tot 31 tekens",
    ]);
  });

  it("een korte hexkleur wordt uitgeschreven", () => {
    const config = withPatch((raw) => (section(section(raw, "brand"), "colours").primary = "#ABC"));
    expect(normaliseConfig(config, manifest).config?.brand.colours.primary).toBe("#aabbcc");
  });

  it("een onbekende, een gereserveerde en een onvolledige modulekeuze", () => {
    expect(errorsOf(withPatch((raw) => (raw.modules = ["auth-entra", "lake"])))).toEqual([
      'modules: onbekende module "lake"; beschikbaar: auth-entra, auth-password, jobs, messaging, files, ai',
    ]);
    expect(errorsOf(withPatch((raw) => (raw.modules = ["auth-entra", "portal"])))).toEqual([
      'modules: module "portal" is gereserveerd voor een latere versie van het template en nog niet beschikbaar',
    ]);
    expect(errorsOf(withPatch((raw) => (raw.modules = ["auth-entra", "messaging"])))).toEqual(['modules: module "messaging" vereist "jobs"; zet die er ook in']);
  });

  it("de inlogmodule hoort bij de provider, en er is er maar één", () => {
    expect(errorsOf(withPatch((raw) => (raw.modules = [])))).toEqual(['modules: auth.provider is "entra", dus "auth-entra" hoort in modules']);
    expect(errorsOf(withPatch((raw) => (raw.modules = ["auth-entra", "auth-password", "messaging", "jobs"])))).toEqual([
      'modules: "auth-entra" en "auth-password" gaan niet samen',
    ]);
  });

  it("rollen zijn uniek, minstens één is beheerder, en dev-accounts kennen hun rol", () => {
    const roles = [
      { value: "admin", label: { nl: "Beheerder", en: "Administrator" }, admin: false },
      { value: "admin", label: { nl: "Nog een", en: "Another" }, admin: false },
    ];
    expect(errorsOf(withPatch((raw) => (section(raw, "auth").roles = roles)))).toEqual([
      'auth.roles: rol "admin" komt twee keer voor',
      "auth.roles: minstens één rol heeft admin: true, anders kan niemand Beheer openen",
    ]);
    const devUsers = [{ email: "x@dev.invalid", displayName: "X", roles: ["viewer"] }];
    expect(errorsOf(withPatch((raw) => (section(raw, "auth").devUsers = devUsers)))).toEqual(['auth.devUsers[0].roles: onbekende rol "viewer"; bekend: admin, member']);
  });

  it("een logo als afbeelding heeft een pad, een tekstmerk niet", () => {
    expect(errorsOf(withPatch((raw) => (section(raw, "brand").logo = { kind: "image" })))).toEqual([
      "brand.logo.path: verplicht bij kind image, bijvoorbeeld public/brand/logo.svg",
    ]);
    expect(errorsOf(withPatch((raw) => (section(raw, "brand").logo = { kind: "wordmark", path: "public/brand/logo.svg" })))).toEqual([
      "brand.logo.path: hoort bij kind image; bij wordmark is het null",
    ]);
  });

  it("weigert geheimen, ook onder intake", () => {
    expect(errorsOf(withPatch((raw) => (raw.intake = { database: "postgresql://user:pw@host/db" })))).toEqual([
      "intake.database: lijkt een verbindingsstring; geheimen horen in .env.local en in Vercel, nooit in project.config.json",
    ]);
    expect(errorsOf(withPatch((raw) => (raw.intake = { githubToken: "abcdefghijklmnop" })))).toEqual([
      "intake.githubToken: de naam van dit veld zegt dat het een geheim is; geheimen horen in .env.local en in Vercel, nooit in project.config.json",
    ]);
  });

  it("meldt geen geldige JSON met de reden", () => {
    const report = parseConfig("{ dit is geen json", manifest);
    expect(report.config).toBeUndefined();
    expect(report.errors[0]?.message).toContain("geen geldige JSON");
  });
});

describe("waarschuwingen", () => {
  it("wachtwoordinstellingen bij Entra en Teams zonder messaging", () => {
    const config = withPatch((raw) => {
      section(raw, "auth").password = { mfaRequiredFor: "everyone" };
      raw.messaging = { transport: "smtp", teams: true };
    });
    const report = normaliseConfig(config, manifest);
    expect(report.errors).toEqual([]);
    expect(report.warnings.map((problem) => problem.path)).toEqual(["auth.password", "messaging.teams"]);
  });
});
