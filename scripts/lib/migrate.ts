/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Migraties toepassen en terugdraaien, **elk in een eigen transactie**.
 *
 * Gedeeld door `pnpm db:migrate`, `pnpm db:deploy`, `pnpm db:down` en `pnpm db:roundtrip`. Eén
 * codepad, want een migratieloop die op je dev-branch iets anders doet dan op een preview is precies
 * het soort verschil dat pas op vrijdagmiddag opvalt.
 *
 * ---
 *
 * **Waarom dit bestaat en niet `migrate()` uit drizzle-orm.**
 *
 * Die functie draait **alle** openstaande migraties in één transactie. Dat klinkt veiliger dan het
 * is, want Postgres verbiedt het gebruiken van een enumwaarde in dezelfde transactie waarin hij is
 * toegevoegd. Een keten met een nieuwe enumwaarde en een latere migratie die hem gebruikt, gaat op een
 * database waar de eerste al stond goed, en faalt op een verse branch waar alles in één keer moet, met
 * "unsafe use of new value of enum type". Per bestand een transactie lost dat structureel op.
 *
 * **Wat het kost:** breekt migratie vier van zeven, dan staan de eerste drie er wel. Dat is de normale
 * afspraak bij migraties (Rails, Flyway en Liquibase doen het zo) en het is beter dan één transactie
 * die urenlang locks vasthoudt en bij de laatste regel alles teruggeeft. Elke migratie hier heeft een
 * geteste terugweg, dus halverwege stoppen is een toestand waar je uit komt.
 *
 * **De boekhouding blijft die van drizzle**, tot en met de hash: dezelfde tabel, dezelfde kolommen,
 * sha256 over de volledige bestandsinhoud. Een database die eerder met `drizzle-kit migrate` is
 * bijgewerkt loopt hier gewoon verder.
 */

import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Pool } from "@neondatabase/serverless";
import { splitStatements } from "./sql-file";

export interface JournalEntry {
  readonly idx: number;
  readonly when: number;
  readonly tag: string;
}
interface Journal {
  readonly entries: JournalEntry[];
}

export const MIGRATIONS_DIR = join(process.cwd(), "lib", "db", "migrations");

/** Precies de tabel die drizzle aanmaakt. Wijkt die af, dan lopen de twee uiteen. */
const ENSURE_TABLE = `
  create schema if not exists "drizzle";
  create table if not exists "drizzle"."__drizzle_migrations" (
    id serial primary key,
    hash text not null,
    created_at bigint
  );
`;

export interface Migration {
  readonly tag: string;
  readonly when: number;
  readonly hash: string;
  readonly statements: string[];
}

export function readJournal(): JournalEntry[] {
  const raw = readFileSync(join(MIGRATIONS_DIR, "meta", "_journal.json"), "utf8");
  return (JSON.parse(raw) as Journal).entries;
}

/**
 * De hash zoals drizzle hem berekent: sha256 over de **ruwe** bestandsinhoud, dus vóór het splitsen
 * en zonder trimmen. Wie hier iets aan verandert, laat elke bestaande database opnieuw migreren.
 */
export function readMigration(entry: JournalEntry): Migration {
  const sql = readFileSync(join(MIGRATIONS_DIR, `${entry.tag}.sql`), "utf8");
  return {
    tag: entry.tag,
    when: entry.when,
    hash: createHash("sha256").update(sql).digest("hex"),
    statements: splitStatements(sql),
  };
}

/**
 * Wat Postgres écht zei.
 *
 * De fout die uit een mislukte migratie komt bevat standaard alleen de query. De reden zit in `code`,
 * `detail` en `hint`, en zonder die drie is "Failed query" in een buildlog een raadsel.
 */
function describeFailure(tag: string, statement: string, error: unknown): Error {
  const pg = error as { message?: string; code?: string; detail?: string; hint?: string };
  const lines = [
    `Migratie ${tag} is mislukt.`,
    "",
    pg.message ?? String(error),
    ...(pg.code === undefined ? [] : [`Postgres-code: ${pg.code}`]),
    ...(pg.detail === undefined ? [] : [`Detail: ${pg.detail}`]),
    ...(pg.hint === undefined ? [] : [`Hint: ${pg.hint}`]),
    "",
    "Het statement:",
    statement.trim(),
    "",
    "Wat er vóór deze migratie is toegepast, staat er wel: elke migratie heeft een",
    "eigen transactie. Repareer het bestand en draai opnieuw.",
  ];
  return new Error(lines.join("\n"));
}

/**
 * Past toe wat er nog niet staat en geeft terug welke.
 *
 * De keuze wie er nog moet, gaat op `created_at` van de laatst toegepaste rij, net als bij drizzle:
 * het journal is chronologisch en de tijdstempel erin is de sleutel.
 */
export async function applyMigrations(pool: Pool): Promise<string[]> {
  await pool.query(ENSURE_TABLE);

  const last = await pool.query<{ created_at: string | null }>(
    `select created_at from "drizzle"."__drizzle_migrations" order by created_at desc limit 1`,
  );
  const lastWhen = Number(last.rows[0]?.created_at ?? 0);

  const pending = readJournal()
    .filter((entry) => entry.when > lastWhen)
    .map(readMigration);

  if (pending.length === 0) return [];

  const applied: string[] = [];

  for (const migration of pending) {
    const client = await pool.connect();
    let running = "";
    try {
      await client.query("begin");
      for (const statement of migration.statements) {
        running = statement;
        await client.query(statement);
      }
      await client.query(`insert into "drizzle"."__drizzle_migrations" ("hash", "created_at") values ($1, $2)`, [
        migration.hash,
        migration.when,
      ]);
      await client.query("commit");
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw describeFailure(migration.tag, running, error);
    } finally {
      client.release();
    }

    console.log(`  toegepast   ${migration.tag}`);
    applied.push(migration.tag);
  }

  return applied;
}

/**
 * Draait de laatst toegepaste migratie terug met het bestand uit `down/` dat dezelfde naam draagt,
 * en haalt de rij uit de migratietabel. Geeft de tag terug, of undefined als er niets stond.
 *
 * Welke migratie dat is volgt uit het **aantal** toegepaste rijen en niet uit de laatste regel van
 * het journal: na één keer terugdraaien staat die er nog steeds, en dan zou een tweede keer dezelfde
 * migratie opnieuw ongedaan proberen te maken.
 */
export async function rollbackLastMigration(pool: Pool): Promise<string | undefined> {
  const journal = readJournal();
  const applied = await pool.query<{ hash: string }>(`select hash from "drizzle"."__drizzle_migrations" order by created_at`);
  const count = applied.rows.length;
  if (count === 0) return undefined;

  const last = applied.rows[count - 1];
  const entry = journal[count - 1];
  if (last === undefined || entry === undefined) {
    throw new Error(`Er zijn ${count} migraties toegepast maar het journal kent er ${journal.length}. Die twee horen gelijk te lopen.`);
  }

  const downPath = join(MIGRATIONS_DIR, "down", `${entry.tag}.sql`);
  let downSql: string;
  try {
    downSql = readFileSync(downPath, "utf8");
  } catch {
    throw new Error(`Er is geen terugweg voor ${entry.tag}. Verwacht bestand: lib/db/migrations/down/${entry.tag}.sql`);
  }

  const client = await pool.connect();
  let running = "";
  try {
    await client.query("begin");
    for (const statement of splitStatements(downSql)) {
      running = statement;
      await client.query(statement);
    }
    await client.query(`delete from "drizzle"."__drizzle_migrations" where hash = $1`, [last.hash]);
    await client.query("commit");
  } catch (error) {
    await client.query("rollback").catch(() => undefined);
    throw describeFailure(`${entry.tag} (terugweg)`, running, error);
  } finally {
    client.release();
  }

  console.log(`  teruggedraaid   ${entry.tag}`);
  return entry.tag;
}

/** Hoeveel migraties er op deze database staan; nul als de tabel er nog niet is. */
export async function countAppliedMigrations(pool: Pool): Promise<number> {
  try {
    const result = await pool.query<{ n: string }>(`select count(*)::text as n from "drizzle"."__drizzle_migrations"`);
    return Number(result.rows[0]?.n ?? "0");
  } catch (error) {
    if ((error as { code?: unknown }).code === "42P01") return 0;
    throw error;
  }
}
