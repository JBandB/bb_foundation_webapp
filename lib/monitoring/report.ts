/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Foutrapportage zonder persoonsgegevens. Eén plek waar een serverfout langskomt voordat hij ergens
 * heen gaat: nu de console van Vercel, met de gereserveerde module monitoring-sentry straks ook een
 * envelop naar Sentry (zie docs/patronen/sentry-envelope.md).
 *
 * Waarom schoonmaken nodig is (les L-WERK-08): de melding van Drizzle bevat de query mét parameters,
 * een Postgres-detail bevat de sleutelwaarde (`Key (email)=(iemand@voorbeeld.nl)`), en een
 * V8-stack begint met de melding zelf. Dus melding én stack gaan door dezelfde schoonmaak, en de
 * uitkomst wordt afgekapt.
 *
 * Rapporteren mag zelf nooit gooien: een haak die omvalt maakt van één storing twee.
 */

export const MAX_REPORT_LENGTH = 2000;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const CONNECTION_STRING = /\b(?:postgres(?:ql)?|mysql|mongodb(?:\+srv)?|redis|amqp|https?):\/\/[^\s"']*:[^\s"'@]*@[^\s"']+/g;
const BEARER = /\bBearer\s+[A-Za-z0-9._~+/=-]+/g;
const JWT = /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]*/g;
const KEY_DETAIL = /Key \(([^)]*)\)=\([^)]*\)/g;
const DRIZZLE_PARAMS = /\bparams:\s[\s\S]*$/;
const SAS_OR_SIGNATURE = /([?&](?:sig|sv|se|sp|token|key|secret)=)[^&\s"']+/gi;

/** Haalt uit een tekst weg wat naar een persoon of een geheim kan wijzen. Puur, dus los te testen. */
export function scrubMessage(text: string): string {
  const cleaned = text
    .replace(DRIZZLE_PARAMS, "params: [weggelaten]")
    .replace(KEY_DETAIL, "Key ($1)=(...)")
    .replace(CONNECTION_STRING, "[verbindingsstring]")
    .replace(BEARER, "Bearer [token]")
    .replace(JWT, "[token]")
    .replace(SAS_OR_SIGNATURE, "$1[weggelaten]")
    .replace(EMAIL, "[e-mail]");
  return cleaned.length > MAX_REPORT_LENGTH ? `${cleaned.slice(0, MAX_REPORT_LENGTH)} [afgekapt]` : cleaned;
}

export interface ReportContext {
  /** Het routebestand, zoals `/app/admin/[id]` (uit `onRequestError`), of een eigen naam voor een script. */
  readonly route?: string;
  readonly method?: string;
  /** `render`, `route`, `action` of `proxy` bij Next; vrij bij eigen aanroepen. */
  readonly kind?: string;
}

export interface ErrorReport {
  readonly name: string;
  readonly message: string;
  readonly stack: string | undefined;
  /** De digest die Next in plaats van de melding naar de browser stuurt; daarmee is een melding terug te vinden. */
  readonly digest: string | undefined;
}

/** Maakt van een gegooide waarde een schoongemaakt rapport. Gooit zelf nooit. */
export function describeError(error: unknown): ErrorReport {
  try {
    if (error instanceof Error) {
      const digest = "digest" in error && typeof error.digest === "string" ? error.digest : undefined;
      return {
        name: error.name,
        message: scrubMessage(error.message),
        stack: error.stack === undefined ? undefined : scrubMessage(error.stack),
        digest,
      };
    }
    return { name: typeof error, message: scrubMessage(String(error)), stack: undefined, digest: undefined };
  } catch {
    return { name: "unknown", message: "[niet te beschrijven]", stack: undefined, digest: undefined };
  }
}

/**
 * Meldt een serverfout. Nu: één regel naar de console van Vercel, schoongemaakt. De gereserveerde
 * module monitoring-sentry hangt hier het versturen aan, zonder dat de aanroepers veranderen.
 */
export async function reportError(error: unknown, context: ReportContext = {}): Promise<void> {
  try {
    const report = describeError(error);
    const where = [context.kind, context.method, context.route].filter((part) => part !== undefined && part !== "").join(" ");
    console.error(`[report] ${where === "" ? "?" : where}: ${report.name}: ${report.message}${report.digest === undefined ? "" : ` (digest ${report.digest})`}`);
    if (report.stack !== undefined) console.error(report.stack);
  } catch {
    /* Rapporteren mag nooit zelf een fout worden. */
  }
}
