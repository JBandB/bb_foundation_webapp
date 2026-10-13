/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het lezen van `project.config.json`: afleiden wat ontbreekt, valideren tegen het schema, en daarna
 * de controles die over meer dan één veld gaan (modules die elkaar nodig hebben, de inlogmodule bij
 * de provider, rollen die bestaan) plus de geheimenwacht. Wie dit bestand leest, krijgt óf een
 * volledige, genormaliseerde configuratie, óf een lijst problemen met het pad erbij. Nooit iets
 * ertussenin.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { DEFAULT_ROLES, PROJECT_CONFIG_SCHEMA, type AuthProvider, type ProjectConfig } from "./config-schema";
import { isPlainObject, validate, type Problem } from "./dsl";
import type { Manifest } from "./manifest";

export const CONFIG_FILE = "project.config.json";

export interface ConfigReport {
  /** Alleen gevuld als er geen fouten zijn. Waarschuwingen staan een configuratie niet in de weg. */
  readonly config: ProjectConfig | undefined;
  readonly errors: readonly Problem[];
  readonly warnings: readonly Problem[];
}

export function readConfig(root: string, manifest: Manifest): ConfigReport {
  let text: string;
  try {
    text = readFileSync(join(root, CONFIG_FILE), "utf8");
  } catch {
    return failure(`${CONFIG_FILE} ontbreekt; de wizard maakt hem, of kopieer examples/default.project.config.json`);
  }
  return parseConfig(text, manifest);
}

export function parseConfig(text: string, manifest: Manifest): ConfigReport {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch (error) {
    return failure(`${CONFIG_FILE} is geen geldige JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  return normaliseConfig(raw, manifest);
}

export function normaliseConfig(input: unknown, manifest: Manifest): ConfigReport {
  if (!isPlainObject(input)) return failure("de configuratie moet een object zijn (accolades)");

  const raw = structuredClone(input);
  delete raw.$schema;
  applyDerivedDefaults(raw);

  const validated = validate(PROJECT_CONFIG_SCHEMA, raw);
  if (!validated.ok) return { config: undefined, errors: validated.errors, warnings: [] };

  const config = validated.value;
  const errors: Problem[] = [];
  const warnings: Problem[] = [];
  checkModules(config, manifest, errors);
  checkRoles(config, errors);
  checkLogo(config, errors);
  checkSecrets(raw, "", errors);

  if (config.auth.provider === "entra" && isPlainObject(input.auth) && input.auth.password !== undefined) {
    warnings.push({ path: "auth.password", message: "heeft alleen effect bij provider password" });
  }
  if (config.messaging.teams && !config.modules.includes("messaging")) {
    warnings.push({ path: "messaging.teams", message: "doet niets zolang de module messaging niet is toegepast" });
  }

  return { config: errors.length === 0 ? config : undefined, errors, warnings };
}

function failure(message: string): ConfigReport {
  return { config: undefined, errors: [{ path: "", message }], warnings: [] };
}

/** De inlogmodule die bij een provider hoort. */
export function authModuleFor(provider: AuthProvider): string {
  return `auth-${provider}`;
}

/** De locale voor getallen, datums en sorteren, afgeleid van de taal van de interface. */
export function deriveLocale(uiLanguage: ProjectConfig["project"]["uiLanguage"]): string {
  return uiLanguage === "en" ? "en-GB" : "nl-NL";
}

/**
 * Vult de velden met `derived` in het schema in, voor de validatie. Alleen als de velden waar de
 * afleiding op steunt er al zijn en de juiste vorm hebben; anders laat dit ze leeg en meldt de
 * validatie dat ze ontbreken, met de afleidregel erbij.
 */
function applyDerivedDefaults(raw: Record<string, unknown>): void {
  const project = raw.project;
  if (isPlainObject(project)) {
    if (project.shortName === undefined && typeof project.name === "string") {
      project.shortName = project.name.trim().slice(0, 20).trim();
    }
    if (project.systemEmail === undefined) {
      const organisation = project.organisation;
      const domain = isPlainObject(organisation) && typeof organisation.mailDomain === "string" ? organisation.mailDomain : undefined;
      if (domain !== undefined) project.systemEmail = `system@${domain.toLowerCase()}`;
      else if (typeof project.slug === "string") project.systemEmail = `system@${project.slug}.invalid`;
    }
  }

  const auth = raw.auth;
  if (isPlainObject(auth)) {
    if (raw.modules === undefined && (auth.provider === "entra" || auth.provider === "password")) {
      raw.modules = [authModuleFor(auth.provider)];
    }
    if (auth.devUsers === undefined) {
      const roles: unknown = auth.roles === undefined ? DEFAULT_ROLES : auth.roles;
      const language = isPlainObject(project) && project.uiLanguage === "en" ? "en" : "nl";
      if (Array.isArray(roles)) {
        auth.devUsers = roles.flatMap((role: unknown) => {
          if (!isPlainObject(role) || typeof role.value !== "string") return [];
          const label = isPlainObject(role.label) && typeof role.label[language] === "string" ? role.label[language] : role.value;
          return [{ email: `${role.value}@dev.invalid`, displayName: `${label} (dev)`, roles: [role.value] }];
        });
      }
    }
  }
}

function checkModules(config: ProjectConfig, manifest: Manifest, errors: Problem[]): void {
  const messages = new Set<string>();
  const available = Object.entries(manifest.modules)
    .filter(([, module]) => !module.always && module.status !== "reserved")
    .map(([name]) => name);

  for (const name of config.modules) {
    if (name === "core") {
      messages.add("core is altijd aanwezig en staat niet in deze lijst");
      continue;
    }
    const entry = manifest.modules[name];
    if (entry === undefined) {
      messages.add(`onbekende module "${name}"; beschikbaar: ${available.join(", ")}`);
      continue;
    }
    if (entry.status === "reserved") {
      messages.add(`module "${name}" is gereserveerd voor een latere versie van het template en nog niet beschikbaar`);
      continue;
    }
    for (const required of entry.requires) {
      if (!config.modules.includes(required)) messages.add(`module "${name}" vereist "${required}"; zet die er ook in`);
    }
    for (const other of entry.conflicts) {
      if (config.modules.includes(other)) messages.add(`"${[name, other].sort().join('" en "')}" gaan niet samen`);
    }
  }

  const wanted = authModuleFor(config.auth.provider);
  if (!config.modules.includes(wanted)) {
    messages.add(`auth.provider is "${config.auth.provider}", dus "${wanted}" hoort in modules`);
  }

  for (const message of messages) errors.push({ path: "modules", message });
}

function checkRoles(config: ProjectConfig, errors: Problem[]): void {
  const values = config.auth.roles.map((role) => role.value);
  const seen = new Set<string>();
  for (const value of values) {
    if (seen.has(value)) errors.push({ path: "auth.roles", message: `rol "${value}" komt twee keer voor` });
    seen.add(value);
  }
  if (!config.auth.roles.some((role) => role.admin)) {
    errors.push({ path: "auth.roles", message: "minstens één rol heeft admin: true, anders kan niemand Beheer openen" });
  }

  const emails = new Set<string>();
  config.auth.devUsers.forEach((user, index) => {
    for (const role of user.roles) {
      if (!values.includes(role)) errors.push({ path: `auth.devUsers[${index}].roles`, message: `onbekende rol "${role}"; bekend: ${values.join(", ")}` });
    }
    if (emails.has(user.email)) errors.push({ path: `auth.devUsers[${index}].email`, message: `${user.email} komt twee keer voor` });
    emails.add(user.email);
  });
}

function checkLogo(config: ProjectConfig, errors: Problem[]): void {
  const { kind, path } = config.brand.logo;
  if (kind === "image" && path === null) {
    errors.push({ path: "brand.logo.path", message: "verplicht bij kind image, bijvoorbeeld public/brand/logo.svg" });
  }
  if (kind === "wordmark" && path !== null) {
    errors.push({ path: "brand.logo.path", message: "hoort bij kind image; bij wordmark is het null" });
  }
}

/**
 * De geheimenwacht. Dit bestand staat in git en in de bundel van de tooling, dus een verbindingsstring
 * of een token hoort er nooit in, ook niet onder intake. De patronen zijn de vormen die in de praktijk
 * per ongeluk in configuratie belanden; de sleutelnamen vangen de rest.
 */
const SECRET_VALUES: readonly { readonly pattern: RegExp; readonly label: string }[] = [
  { pattern: /^(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqps?):\/\//i, label: "een verbindingsstring" },
  { pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/, label: "een privésleutel" },
  { pattern: /^eyJ[\w-]{8,}\.[\w-]{8,}\.[\w-]+$/, label: "een JWT" },
  { pattern: /^(?:ghp|gho|ghu|ghs|github_pat)_[A-Za-z0-9_]{20,}$/, label: "een GitHub-token" },
  { pattern: /^xox[abp]-/, label: "een Slack-token" },
  { pattern: /^sk-[A-Za-z0-9_-]{20,}$/, label: "een API-sleutel" },
  { pattern: /^AKIA[0-9A-Z]{16}$/, label: "een AWS-sleutel" },
];
const SECRET_KEY = /secret|token|passw|apikey|api_key|connectionstring|connection_string/i;

function checkSecrets(value: unknown, path: string, errors: Problem[]): void {
  if (typeof value === "string") {
    const key = path.split(".").pop() ?? "";
    const hit = SECRET_VALUES.find((candidate) => candidate.pattern.test(value));
    if (hit !== undefined) {
      errors.push({ path, message: `lijkt ${hit.label}; geheimen horen in .env.local en in Vercel, nooit in ${CONFIG_FILE}` });
    } else if (SECRET_KEY.test(key) && value.length > 8) {
      errors.push({ path, message: `de naam van dit veld zegt dat het een geheim is; geheimen horen in .env.local en in Vercel, nooit in ${CONFIG_FILE}` });
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => checkSecrets(item, `${path}[${index}]`, errors));
    return;
  }
  if (isPlainObject(value)) {
    for (const [key, item] of Object.entries(value)) checkSecrets(item, path === "" ? key : `${path}.${key}`, errors);
  }
}
