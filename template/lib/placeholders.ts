/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Placeholders in seeds: `{{project.name}}`, `{{today.long}}`, `{{template.version}}`. Een seed wordt
 * één keer gerenderd en is daarna van het project, dus de lijst is kort en bewust: wat een nieuw
 * project in zijn documenten nodig heeft en verder niets. Een onbekende naam gooit, want dat is een
 * fout van wie de seed schreef en die hoort niet stil in een project te belanden.
 */
import type { ProjectConfig } from "./config-schema";
import { deriveLocale } from "./config";

export interface PlaceholderContext {
  readonly config: ProjectConfig;
  /** De datum van renderen als jjjj-mm-dd; de zelftest van het template geeft een vaste datum mee. */
  readonly today: string;
  readonly templateVersion: string;
  readonly templateSource: string | null;
}

export function placeholderValues(context: PlaceholderContext): Readonly<Record<string, string>> {
  const { project } = context.config;
  return {
    "project.name": project.name,
    "project.shortName": project.shortName,
    "project.slug": project.slug,
    "project.description": project.description,
    "project.organisation.name": project.organisation.name,
    "project.uiLanguage": project.uiLanguage,
    "project.homePath": project.homePath,
    "project.systemEmail": project.systemEmail,
    today: context.today,
    "today.long": longDate(context.today, deriveLocale(project.uiLanguage)),
    "template.version": context.templateVersion,
    "template.source": context.templateSource ?? "(nog niet ingesteld)",
    "auth.matrix": matrixLines(context.config),
  };
}

/**
 * De regels van de rechtenmatrix in `lib/auth/matrix.ts`: één per rol, een beheerdersrol krijgt alles,
 * elke andere rol begint met niets. Rolwaarden zijn altijd geldige namen (zie ROLE_VALUE), dus de
 * sleutels hoeven geen aanhalingstekens.
 */
export function matrixLines(config: ProjectConfig): string {
  return config.auth.roles.map((role) => `  ${role.value}: ${role.admin ? "[...ACTIONS]" : "[]"},`).join("\n");
}

const PLACEHOLDER = /\{\{\s*([a-zA-Z][a-zA-Z0-9_.]*)\s*\}\}/g;

export function renderPlaceholders(text: string, context: PlaceholderContext, fileName = "seed"): string {
  const values = placeholderValues(context);
  return text.replace(PLACEHOLDER, (_match, name: string) => {
    const value = values[name];
    if (value === undefined) {
      throw new Error(`Onbekende placeholder {{${name}}} in ${fileName}. Bekend: ${Object.keys(values).join(", ")}`);
    }
    return value;
  });
}

/** Welke placeholders een tekst gebruikt, voor de zelftest van het template. */
export function placeholdersIn(text: string): string[] {
  return [...text.matchAll(PLACEHOLDER)].map((match) => match[1] ?? "");
}

/** Vandaag als jjjj-mm-dd in een tijdzone, zodat een render om middernacht de dag van de gebruiker krijgt. */
export function todayIn(timezone: string, now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** `2026-10-02` wordt `2 oktober 2026` (nl-NL) of `2 October 2026` (en-GB). */
export function longDate(isoDate: string, locale: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined || Number.isNaN(year + month + day)) {
    throw new Error(`Geen datum als jjjj-mm-dd: ${isoDate}`);
  }
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}
