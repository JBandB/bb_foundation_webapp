/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Waar zit ik, en wat staat erin.
 *
 * Draai dit voordat je een migratie of een seed afvuurt. Een branch verwisselen is de makkelijkste
 * vergissing bij dit soort scripts en de duurste, want je merkt het pas als er data mist of juist te
 * veel is.
 *
 * Gebruik: pnpm db:status
 *
 * Het oordeel onderaan combineert twee onafhankelijke signalen: het endpoint tegen SEED_TARGET (wat
 * jij hebt verklaard) en of er dev-accounts in staan (wat de database zelf zegt). Twee signalen en niet
 * één, omdat het eerste een variabele is die kan verlopen en het tweede een feit dat je niet per
 * ongeluk zet.
 */

import type { Pool } from "@neondatabase/serverless";
import { describeTarget, directUrl, isProductionEndpoint, withDirectDb } from "./lib/connection";
import { countAppliedMigrations, readJournal } from "./lib/migrate";
import { runScript } from "./lib/run";

interface UserCounts {
  readonly dev: number;
  readonly real: number;
}

async function readUserCounts(pool: Pool): Promise<UserCounts | undefined> {
  try {
    const result = await pool.query<{ dev: string; real: string }>(
      `select
         count(*) filter (where external_id like 'dev:%')::text as dev,
         count(*) filter (where external_id not like 'dev:%')::text as real
       from users`,
    );
    const row = result.rows[0];
    if (row === undefined) return undefined;
    return { dev: Number(row.dev), real: Number(row.real) };
  } catch {
    /* Nog geen users-tabel, dus nog geen migraties. Dat is geen fout. */
    return undefined;
  }
}

/** Het oordeel in één regel. Twijfelgevallen worden benoemd en niet weggemoffeld in een groen vinkje. */
function verdict(endpoint: string, declared: string | undefined, counts: UserCounts | undefined): string {
  if (isProductionEndpoint(endpoint)) {
    return "LET OP. Dit is de productiedatabase (PRODUCTION_DB_ENDPOINT). Alleen lezen, en migreren alleen via de deploy.";
  }
  const matchesDeclared = declared !== undefined && declared === endpoint;
  const hasDev = counts !== undefined && counts.dev > 0;
  const hasReal = counts !== undefined && counts.real > 0;

  if (matchesDeclared && hasDev && !hasReal) {
    return "Dit is je wegwerpbranch. SEED_TARGET klopt en er staan alleen dev-accounts in.";
  }
  if (matchesDeclared && hasReal) {
    return "LET OP. SEED_TARGET wijst hierheen, maar er staan gebruikers in die via een echte login zijn aangemaakt. Controleer of dit wel je dev-branch is.";
  }
  if (matchesDeclared) {
    return "SEED_TARGET wijst hierheen. Er staan nog geen gebruikers in, dus draai pnpm db:seed.";
  }
  if (hasReal && !hasDev) {
    return "LET OP. Dit is niet je bevestigde wegwerpbranch en er staan echte gebruikers in. Dit lijkt op productie.";
  }
  if (declared === undefined) {
    return "SEED_TARGET staat niet in je omgeving, dus er is niets om tegen af te zetten. Zet hem in .env.local op het endpoint van je dev-branch.";
  }
  return `LET OP. Dit endpoint is niet wat SEED_TARGET zegt (${declared}). Je kijkt naar een andere branch dan je denkt.`;
}

runScript(async () => {
  const declared = process.env.SEED_TARGET;
  const endpoint = describeTarget(directUrl());

  await withDirectDb(async (pool) => {
    const extensions = await pool.query<{ extname: string }>(`select extname from pg_extension where extname <> 'plpgsql' order by 1`);
    console.log("Extensies  :", extensions.rows.map((row) => row.extname).join(", ") || "geen");

    const tables = await pool.query<{ table_name: string; n: string }>(
      `select c.relname as table_name, coalesce(s.n_live_tup, 0)::text as n
         from pg_class c
         join pg_namespace ns on ns.oid = c.relnamespace
         left join pg_stat_user_tables s on s.relid = c.oid
        where ns.nspname = 'public' and c.relkind = 'r'
        order by 1`,
    );
    console.log(`Tabellen   : ${tables.rows.length === 0 ? "geen" : ""}`);
    for (const row of tables.rows) console.log(`  ${row.table_name.padEnd(24)} circa ${row.n} rijen`);

    const applied = await countAppliedMigrations(pool);
    const known = readJournal().length;
    console.log(`Migraties  : ${applied} toegepast, de code kent er ${known}${applied < known ? " (de database loopt achter: pnpm db:migrate)" : ""}`);

    const counts = await readUserCounts(pool);
    if (counts !== undefined) console.log(`Gebruikers : ${counts.dev} dev-accounts, ${counts.real} via een echte login`);

    console.log(`SEED_TARGET: ${declared ?? "niet gezet"}${declared === endpoint ? " (komt overeen)" : ""}`);
    console.log(`\n${verdict(endpoint, declared, counts)}`);
  });
});
