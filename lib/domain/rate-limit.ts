/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { lt, sql } from "drizzle-orm";
import type { DbOrTransaction } from "@/lib/db/client";
import { rateLimits } from "@/lib/db/schema";

/**
 * Een grens op alles wat van buiten te raken is: een inlogpoging, een hulpformulier, een melding.
 *
 * ---
 *
 * **Een vast venster en geen schuivend.** De teller hoort bij het uur of de dag waarin de poging
 * valt, en op de venstergrens begint hij opnieuw. Iemand kan in theorie twee keer de limiet halen door
 * precies om de grens heen te werken, en dat is hier prima: dit is een slot tegen volume, geen exacte
 * meter. Een schuivend venster kost een rij per poging in plaats van een teller per venster.
 *
 * **Faalt dicht op de teller, open op de storing.** Een poging boven de grens wordt geweigerd, en de
 * teller telt door zodat aanhoudend duwen de grens dicht houdt. Maar als de tabel zelf onbereikbaar
 * is, gooit dit gewoon een fout en faalt het formulier zoals elk formulier bij een databasefout: er
 * is geen pad waarin de limiter stilletjes alles doorlaat.
 */

export type RateLimitResult = { readonly ok: true } | { readonly ok: false; readonly retryMinutes: number };

/** De vloer van het venster waar dit moment in valt. */
export function windowStart(now: Date, windowMinutes: number): Date {
  const size = windowMinutes * 60_000;
  return new Date(Math.floor(now.getTime() / size) * size);
}

export async function consumeRateLimit(
  db: DbOrTransaction,
  input: {
    readonly organisationId: string;
    /** Waar de grens over gaat en voor wie: `login:<adres>`, `feedback:<gebruiker>`. */
    readonly key: string;
    /** Hoeveel pogingen er in één venster passen. */
    readonly limit: number;
    readonly windowMinutes: number;
    readonly now?: Date;
  },
): Promise<RateLimitResult> {
  const now = input.now ?? new Date();
  const window = windowStart(now, input.windowMinutes);

  const [row] = await db
    .insert(rateLimits)
    .values({ organisationId: input.organisationId, key: input.key, windowStart: window, count: 1 })
    .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
    .returning({ count: rateLimits.count });

  if (row === undefined || row.count <= input.limit) return { ok: true };

  const windowEnd = window.getTime() + input.windowMinutes * 60_000;
  return { ok: false, retryMinutes: Math.max(1, Math.ceil((windowEnd - now.getTime()) / 60_000)) };
}

/**
 * Vensters van eergisteren en eerder opruimen. Draait mee met de dagelijkse opruimtaak.
 *
 * Twee dagen en niet één: een dagvenster van gisteren kan om middernacht nog nodig zijn om een
 * lopende weigering te dragen, en twee dagen aan tellers is nog steeds niets.
 */
export async function pruneRateLimits(db: DbOrTransaction, now: Date = new Date()): Promise<number> {
  const border = new Date(now.getTime() - 2 * 24 * 60 * 60_000);
  const gone = await db.delete(rateLimits).where(lt(rateLimits.windowStart, border)).returning({ key: rateLimits.key });
  return gone.length;
}

/**
 * Het adres van de aanroeper, uit de headers die Vercel zet.
 *
 * `x-forwarded-for` kan een lijst zijn; de eerste is de client. Zonder header (lokaal, of een
 * runtime die hem niet zet) valt hij terug op een vaste sleutel, en dan delen alle anonieme
 * aanroepers één grens. Dat is de veilige kant: liever één gedeelde grens dan geen.
 */
export function callerAddress(headerValue: string | null): string {
  const first = (headerValue ?? "").split(",")[0]?.trim() ?? "";
  return first === "" ? "onbekend" : first;
}
