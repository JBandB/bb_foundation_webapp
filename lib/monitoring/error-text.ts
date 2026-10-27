/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Een fout in één regel, voor de serverlog of voor een scherm.
 *
 * **Waarom dit bestaat.** De melding van een Drizzle-fout is de mislukte query met de parameters op
 * de tweede regel, en die parameters zijn een e-mailadres, een naam of wat iemand typte. `reportError`
 * maakt dat al schoon, maar een `console.error` met `error.message` of een kolom `last_error` die op
 * een beheerscherm staat, ging erlangs. In een eerder project stonden zo e-mailadressen in de log van
 * de host, een derde partij, en toonden twee beheerschermen de querytekst.
 *
 * - `errorForLog`: wat Postgres zei, zonder detail (daar staan de sleutelwaarden), door `scrubMessage`.
 *   De query mag blijven staan: die zegt welke tabel het was zonder te zeggen wat erin stond.
 * - `errorForScreen`: hetzelfde, maar zonder querytekst. Zegt de `cause`-keten niets bruikbaars, dan
 *   een vaste zin. Het scherm zegt dat het misging, de log waarom.
 *
 * De echte reden van een Drizzle-fout zit in `cause`; `String(error)` geeft alleen "Failed query".
 */
import { describeDbError } from "@/lib/db/errors";
import { labels } from "@/lib/i18n/labels";
import { scrubMessage } from "./report";

/** Zo begint Drizzle een melding over een mislukte query. */
const QUERY_TEXT = /^Failed query:/i;

/** Een fout in één regel voor de serverlog: geen parameters, geen detail, geen e-mailadres. */
export function errorForLog(error: unknown): string {
  return scrubMessage(describeDbError(error, { detail: false }));
}

/** Een fout in één regel voor op een scherm of in een kolom die een scherm toont: ook zonder querytekst. */
export function errorForScreen(error: unknown): string {
  let current: unknown = error;
  for (let depth = 0; depth < 5 && current !== undefined && current !== null; depth += 1) {
    const line = errorForLog(current);
    if (!QUERY_TEXT.test(line)) return line;
    current = current instanceof Error ? current.cause : undefined;
  }
  return labels.system.errorDetailsInLog;
}
