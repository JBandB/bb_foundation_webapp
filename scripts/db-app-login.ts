/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De rol van de app ook lokaal: een inlogrol `<slug>_app` (lid van `app_rw`) op de dev-branch, en
 * `DATABASE_URL_APP` in `.env.local`.
 *
 * Gebruik: pnpm db:app-login
 *
 * ---
 *
 * **Waarom.** Zonder dit draait alles behalve productie als eigenaar: `next dev`, de e2e, een
 * aanvalstest. De eigenaar mag alles en gaat langs elk slot, dus een recht of een regel die de rol
 * van de app mist, valt pas in productie op; in een eerder project was dat het inloggen zelf. Met
 * deze rol werken de app lokaal en de e2e zoals productie. De scripts en de fixtures van de e2e
 * blijven als eigenaar werken (`scripts/lib/connection.ts`), want die doen DDL en zetten testdata
 * klaar.
 *
 * **Veilig te herhalen.** Bestaat de rol al, dan krijgt hij een nieuw wachtwoord en wordt de regel in
 * `.env.local` vervangen. Het wachtwoord komt nooit in beeld, ook niet in een fout. Na elke
 * `vercel env pull` opnieuw draaien, want die overschrijft `.env.local`.
 *
 * **Nooit op productie.** Wijst de verbinding naar het endpoint van productie, of is niet bekend
 * welk dat is (`PRODUCTION_DB_ENDPOINT` ontbreekt), dan stopt het script zonder iets te doen. Op
 * productie maak je de rol met de hand (docs/handleiding/04-neon.md), met een wachtwoord dat alleen
 * in Vercel staat.
 */

import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Pool } from "@neondatabase/serverless";
import { PROJECT } from "../lib/project/config.generated";
import { describeTarget, directUrl } from "./lib/connection";
import { productionVerdict } from "./lib/production-guard";
import { runScript } from "./lib/run";

const ENV_FILE = join(process.cwd(), ".env.local");

/** Alleen letters, cijfers en een liggend streepje: veilig als identifier in SQL. */
export function appLoginRole(slug: string): string {
  const safe = slug.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
  return `${safe === "" ? "project" : safe}_app`;
}

/** De gepoolde verbinding met de rol van de app: dezelfde host als `DATABASE_URL`, een andere inlog. */
export function appUrl(pooled: string, role: string, password: string): string {
  const url = new URL(pooled);
  url.username = role;
  url.password = password;
  return url.toString();
}

/** `.env.local` met de regel `DATABASE_URL_APP` vervangen, of erbij als hij er niet staat. */
export function withAppUrl(text: string, value: string): string {
  const newline = text.includes("\r\n") ? "\r\n" : "\n";
  const line = `DATABASE_URL_APP=${value}`;
  return /^DATABASE_URL_APP=.*$/m.test(text) ? text.replace(/^DATABASE_URL_APP=.*$/m, line) : `${text.replace(/\s*$/, "")}${newline}${line}${newline}`;
}

runScript(async () => {
  const direct = directUrl();
  const endpoint = describeTarget(direct);
  const verdict = productionVerdict(endpoint, process.env.PRODUCTION_DB_ENDPOINT);
  if (verdict !== "allowed") {
    throw new Error(
      verdict === "production"
        ? `${endpoint} is de productiebranch. Er is niets gedaan. Op productie maak je de rol met de hand, zie docs/handleiding/04-neon.md.`
        : "PRODUCTION_DB_ENDPOINT ontbreekt in .env.local, dus er is niet te controleren of dit de productiebranch is. Er is niets gedaan. Zet het endpoint-id van productie erin (handleiding 06 en 07).",
    );
  }
  if (!existsSync(ENV_FILE)) throw new Error("Er is geen .env.local. Haal hem op met: vercel env pull .env.local (handleiding 07).");

  const pooled = (process.env.DATABASE_URL ?? "").trim();
  if (pooled === "") throw new Error("DATABASE_URL ontbreekt in .env.local.");

  const role = appLoginRole(PROJECT.slug);
  /* Alleen letters, cijfers, - en _: veilig in een SQL-tekst en in een URL. */
  const password = randomBytes(24).toString("base64url");

  const pool = new Pool({ connectionString: direct });
  try {
    await pool.query(`
      do $$ begin
        if not exists (select 1 from pg_roles where rolname = '${role}') then
          create role ${role} login in role app_rw;
        end if;
      end $$`);
    await pool.query(`alter role ${role} with login password '${password}'`);
  } finally {
    await pool.end();
  }

  writeFileSync(ENV_FILE, withAppUrl(readFileSync(ENV_FILE, "utf8"), appUrl(pooled, role, password)));
  console.log(`De rol ${role} op ${endpoint} heeft een nieuw wachtwoord, en DATABASE_URL_APP staat in .env.local.`);
  console.log("De waarde staat niet hier. Start next dev of de e2e opnieuw, dan werkt de app als die rol.");
});
