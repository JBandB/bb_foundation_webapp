/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import type { Config } from "drizzle-kit";

/**
 * Migraties lopen over de directe verbinding, niet over de pooler. Zie de toelichting in
 * lib/db/client.ts. Genereren (`pnpm db:generate`) leest alleen bestanden en heeft geen echte
 * verbinding nodig; `pnpm check:drift` geeft daarom een adres mee waar niets luistert.
 */
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;

if (url === undefined || url === "") {
  throw new Error(
    "DATABASE_URL_UNPOOLED ontbreekt. Zet hem in .env.local (zie docs/handleiding/04-neon.md) of haal de variabelen op met vercel env pull .env.local",
  );
}

export default {
  // De hele map via de index, want het schema is per tabel opgesplitst.
  schema: "./lib/db/schema/index.ts",
  out: "./lib/db/migrations",
  dialect: "postgresql",
  dbCredentials: { url },
  strict: true,
  verbose: true,
} satisfies Config;
