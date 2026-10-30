/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het enige codepad naar de database. Geen storage-abstractie, geen mock-repository, geen in-memory
 * fallback. Zie CLAUDE.md regel 10.
 *
 * De applicatie praat altijd via `getDb()`, over de pooler. Migraties lopen buiten dit bestand om,
 * via de scripts op `DATABASE_URL_UNPOOLED`, want DDL over een transaction-mode pooler gaat op
 * onvoorspelbare punten mis. Dat is geen tweede codepad naar de data, het is een ander kanaal voor DDL.
 *
 * **Met de rol van de app, als die er is.** `DATABASE_URL_APP` is de pooled verbinding van een
 * inlogrol die lid is van `app_rw`: lezen en schrijven, geen DDL, de audit log alleen aanvullen, en
 * door het slot op elke tabel heen (lib/db/schema/rls.ts). Een eigen variabele en niet `DATABASE_URL`
 * omzetten, want die beheert de Neon-integratie in Vercel en hem met de hand overschrijven breekt de
 * integratie. Staat hij er niet, dan blijft het `DATABASE_URL`, de eigenaar. Op productie zet je hem
 * met de hand (docs/handleiding/04-neon.md), lokaal schrijft `pnpm db:app-login` hem in `.env.local`,
 * zodat `next dev` en de e2e net als productie werken. `pnpm check:grants` bewijst de rechten.
 *
 * Waarom een functie en niet een geëxporteerde `db`-constante: een constante wordt bij het importeren
 * van deze module opgebouwd, en dan heeft alles wat hier indirect naar verwijst een DATABASE_URL nodig
 * op het moment van importeren. Een `next build` importeert elke pagina om de routes te bepalen, dus
 * dan faalt de build zonder database. Een build hoort geen database nodig te hebben. Nu wordt de
 * verbinding pas opgezet bij de eerste query.
 */

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import * as schema from "./schema";

function required(name: string): string {
  const value = process.env[name];
  if (value === undefined || value === "") {
    throw new Error(`Omgevingsvariabele ${name} ontbreekt. Haal hem op met: vercel env pull .env.local`);
  }
  return value;
}

/** De verbinding van de app: de rol van de app als die gezet is, anders de gewone. */
function appUrl(): string {
  const app = process.env["DATABASE_URL_APP"];
  return app !== undefined && app.trim() !== "" ? app : required("DATABASE_URL");
}

/**
 * Een Pool en niet de HTTP-driver, want een mutatie met een auditregel erbij moet in één transactie,
 * of helemaal niet.
 */
let cached: ReturnType<typeof createDb> | undefined;
let cachedPool: Pool | undefined;

function createDb() {
  const pool = new Pool({ connectionString: appUrl() });
  cachedPool = pool;
  return drizzle({ client: pool, schema });
}

export function getDb(): ReturnType<typeof createDb> {
  cached ??= createDb();
  return cached;
}

/**
 * Sluit de verbinding. **Alleen voor scripts.**
 *
 * Een serverless functie roept dit nooit aan: daar is de pool juist bedoeld om tussen twee aanroepen
 * te blijven leven, want opnieuw verbinden kost meer dan hem openhouden. Een script daarentegen blijft
 * zonder dit hangen nadat het klaar is, omdat er een open socket over is.
 */
export async function closeDb(): Promise<void> {
  if (cachedPool === undefined) return;
  await cachedPool.end();
  cachedPool = undefined;
  cached = undefined;
}

export type Db = ReturnType<typeof createDb>;

/**
 * Het transactie-object dat `db.transaction()` aan zijn callback geeft.
 *
 * Drizzle geeft daar een ander type dan de db zelf, terwijl de queries identiek zijn. Functies die
 * zowel los als binnen een transactie moeten werken nemen daarom `DbOrTransaction`, niet `Db`.
 */
export type Transaction = Parameters<Parameters<Db["transaction"]>[0]>[0];

export type DbOrTransaction = Db | Transaction;

export { schema };
