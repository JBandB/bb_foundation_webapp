/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De directe databaseverbinding voor scripts: migreren, terugdraaien, seeden, bootstrappen, status
 * opvragen en de checkscripts.
 *
 * Niet de pooler, want DDL over een transaction-mode pooler gaat op onvoorspelbare punten mis. Zie de
 * toelichting in lib/db/client.ts.
 *
 * Dit is geen tweede codepad naar de data. De applicatie raakt deze map niet aan: er staat niets in
 * app/ of lib/ dat hiernaar verwijst, en alles loopt via pnpm-scripts. Wat de scripts wel delen met
 * de applicatie is het schema, en dat is precies de bedoeling van CLAUDE.md regel 10.
 */

import { Pool } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-serverless";
import { ownerUrl } from "../../lib/db/owner-url";
import * as schema from "../../lib/db/schema";
import { productionTargetMessage, productionTargetVerdict } from "./production-guard";

/**
 * Drizzle op een directe verbinding. Bestaat als functie zodat het type van de db-instantie op één
 * plek staat en scripts hem aan helpers kunnen doorgeven.
 */
export function scriptDb(pool: Pool) {
  return drizzle({ client: pool, schema });
}

export type ScriptDb = ReturnType<typeof scriptDb>;

/**
 * De directe verbinding als eigenaar: in productie `DATABASE_URL_OWNER` als die er staat, anders
 * `DATABASE_URL_UNPOOLED`. Zie `lib/db/owner-url.ts`.
 */
export function directUrl(): string {
  const url = ownerUrl();
  if (url === undefined) {
    throw new Error("DATABASE_URL_UNPOOLED ontbreekt. Zet hem in .env.local, zie docs/handleiding/04-neon.md.");
  }
  return url;
}

/**
 * Het endpoint-id uit een connectiestring, bijvoorbeeld `ep-frosty-art-a2xtdozx`.
 *
 * Elk script print dit voordat het iets doet. Dat is niet decoratief: een verkeerde branch is de
 * gevaarlijkste vergissing bij dit soort scripts, en het is de enige manier om te zien waar je zit
 * zonder een wachtwoord in beeld te krijgen.
 */
export function describeTarget(url: string): string {
  const host = new URL(url.replace(/^postgres(ql)?:\/\//, "https://")).host;
  return (host.split(".")[0] ?? host).replace(/-pooler$/, "");
}

/** Is dit het productie-endpoint uit de omgeving? Zonder PRODUCTION_DB_ENDPOINT is het antwoord onbekend, en dus nee. */
export function isProductionEndpoint(endpoint: string): boolean {
  const production = process.env.PRODUCTION_DB_ENDPOINT;
  return production !== undefined && production !== "" && production === endpoint;
}

/**
 * Weigert als een productiedeploy naar een andere database dan productie wijst. Het spiegelbeeld van
 * de preview-guard in `db-deploy.ts`; de regel en de melding staan in `production-guard.ts`.
 */
export function assertProductionTarget(url: string): void {
  const endpoint = describeTarget(url);
  const production = process.env.PRODUCTION_DB_ENDPOINT ?? "";
  if (productionTargetVerdict(endpoint, production) === "allowed") return;
  throw new Error(productionTargetMessage(endpoint, production));
}

/** Opent een verbinding, geeft hem aan de functie, en sluit hem altijd weer. */
export async function withDirectDb<T>(fn: (pool: Pool) => Promise<T>): Promise<T> {
  const url = directUrl();
  console.log(`Verbonden met endpoint ${describeTarget(url)}`);
  const pool = new Pool({ connectionString: url });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}
