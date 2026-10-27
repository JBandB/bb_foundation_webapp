/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Databasefouten herkennen zonder op foutteksten te matchen.
 *
 * **Waarom dit bestaat.** Drizzle vangt de fout van de driver en gooit een eigen `Error` waarvan de
 * `message` de mislukte query bevat, met de parameters. De naam van de constraint staat daar niet in:
 * die zit op `error.cause`, de oorspronkelijke fout van Postgres.
 *
 * Een eerdere versie deed `error.message.includes("orders_code_key")`. Dat compileert, leest logisch,
 * en werkt nooit. Het gevolg was een 500 in plaats van "Deze code bestaat al". Gevonden door het uit
 * te proberen, niet door het te lezen.
 *
 * Daarom hier één plek, met de SQLSTATE-code erbij. Die is gestandaardiseerd en verandert niet mee
 * met een nieuwe versie van de driver of van Drizzle.
 */

/** SQLSTATE 23505, unique_violation. */
export const UNIQUE_VIOLATION = "23505";
/** SQLSTATE 23P01, exclusion_violation. Wat een exclusion constraint gooit. */
export const EXCLUSION_VIOLATION = "23P01";
/** SQLSTATE 23514, check_violation. */
export const CHECK_VIOLATION = "23514";
/** SQLSTATE 23001, restrict_violation. Wat de append-only trigger van de audit log gooit. */
export const RESTRICT_VIOLATION = "23001";

export interface DbErrorInfo {
  readonly code: string;
  readonly constraint: string | undefined;
  readonly message: string | undefined;
  readonly detail: string | undefined;
  readonly table: string | undefined;
}

/**
 * Loopt de `cause`-keten af op zoek naar een echte Postgres-fout.
 *
 * Een keten, want elke laag ertussen mag opnieuw inpakken. Nu is het er één, maar daar wil je niet
 * van afhangen.
 */
export function dbErrorInfo(error: unknown): DbErrorInfo | undefined {
  let current: unknown = error;

  for (let depth = 0; depth < 5; depth += 1) {
    if (typeof current !== "object" || current === null) return undefined;

    const candidate = current as { code?: unknown; constraint?: unknown; message?: unknown; detail?: unknown; table?: unknown; cause?: unknown };
    if (typeof candidate.code === "string" && candidate.code !== "") {
      return {
        code: candidate.code,
        constraint: typeof candidate.constraint === "string" ? candidate.constraint : undefined,
        message: typeof candidate.message === "string" ? candidate.message : undefined,
        detail: typeof candidate.detail === "string" ? candidate.detail : undefined,
        table: typeof candidate.table === "string" ? candidate.table : undefined,
      };
    }
    current = candidate.cause;
  }

  return undefined;
}

/**
 * Is dit een schending van deze unieke index.
 *
 * De constraintnaam wordt meegegeven en niet geraden, zodat een tweede unieke index op dezelfde tabel
 * niet stilletjes dezelfde melding oplevert.
 */
export function isUniqueViolation(error: unknown, constraint: string): boolean {
  const info = dbErrorInfo(error);
  return info?.code === UNIQUE_VIOLATION && info.constraint === constraint;
}

/**
 * Is dit een botsing op een exclusion constraint.
 *
 * Andere SQLSTATE dan een unique violation, en dat is precies waarom deze functie bestaat:
 * `isUniqueViolation` geeft `false` op een overlappende periode, en dan valt de fout door als een 500.
 */
export function isExclusionViolation(error: unknown, constraint: string): boolean {
  const info = dbErrorInfo(error);
  return info?.code === EXCLUSION_VIOLATION && info.constraint === constraint;
}

/**
 * Wat Postgres precies zei, in één regel, voor een logbestand.
 *
 * De `message` van Drizzle is de mislukte query plus de parameters, en daar staat de reden niet in.
 * De code, de melding, het detail en de constraint komen alle vier van de fout van Postgres zelf. Bij
 * een trigger die `raise exception` doet, staat de tekst van die melding in `message`, en dat is
 * precies wat je wil lezen.
 *
 * **Geen parameters.** Die staan wel in de Drizzle-melding en horen niet in een log: het zijn de
 * gegevens van een gebruiker. Het detail van Postgres kan dat ook zijn (`Key (email)=(...)`); met
 * `detail: false` blijft het weg, en zo gebruikt `errorForLog` in lib/monitoring/error-text.ts hem.
 */
export function describeDbError(error: unknown, options: { readonly detail?: boolean } = {}): string {
  const info = dbErrorInfo(error);
  if (info === undefined) {
    return error instanceof Error ? (error.message.split("\n")[0] ?? "onbekende fout") : String(error);
  }

  const parts = [
    `SQLSTATE ${info.code}`,
    info.message ?? "",
    options.detail !== false && info.detail !== undefined && info.detail !== "" ? `(${info.detail})` : "",
    info.constraint !== undefined && info.constraint !== "" ? `constraint ${info.constraint}` : "",
    info.table !== undefined && info.table !== "" ? `op ${info.table}` : "",
  ];

  return parts.filter((one) => one !== "").join(" ");
}
