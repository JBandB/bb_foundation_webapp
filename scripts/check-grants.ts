/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm check:grants`: wat de rol van de app mag, wat niet, en of het slot op elke tabel dicht is.
 *
 * Gebruik: pnpm check:grants, op je dev-branch na pnpm db:migrate en pnpm db:bootstrap.
 *
 * ---
 *
 * **Waarom dit een check is.** De app verbindt op productie als een lid van `app_rw`, en niet als
 * eigenaar. Mist er een recht of een regel, dan faalt de app pas op productie, op het scherm dat die
 * tabel leest; de scripts en de fixtures verbinden altijd als eigenaar en merken niets. Deze check
 * bewijst het op de dev-branch: elke tabel in `public` is te lezen en te schrijven, de audit log
 * alleen te lezen en aan te vullen, en DDL, rollen en databases kunnen niet. Het tweede deel neemt in
 * een teruggedraaide transactie de rol zelf aan (`set local role app_rw`), dus het toetst de echte
 * rechten en niet onze lezing ervan.
 *
 * **Meer dan nul, en gelijk aan de eigenaar.** Een check die ">= 0 rijen" eist, bewijst niets: in een
 * eerder project zag de rol nul rijen omdat het slot er zonder regel op stond, en de check vond dat
 * prima. Daarom eist sectie 3 dat de rol evenveel rijen ziet als de eigenaar, en meer dan nul, en
 * bewijst sectie 4 met een tijdelijke rol zonder regel dat het slot echt dicht is.
 */

import { Pool } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { rowsOf } from "../lib/db/rows";
import { APP_ROW_POLICY } from "../lib/db/schema/rls";
import { attempt, createChecker, inRollback } from "./lib/check";
import { describeTarget, directUrl, scriptDb, type ScriptDb } from "./lib/connection";
import { runScript } from "./lib/run";

const ROLE = "app_rw";

/** Voert de query uit in een savepoint en zegt of Postgres hem weigerde om een recht. */
async function refused(tx: ScriptDb, query: ReturnType<typeof sql>): Promise<boolean> {
  try {
    await attempt(tx, async (sp) => {
      await sp.execute(query);
    });
    return false;
  } catch (error) {
    /* Drizzle verpakt de fout van Postgres; de echte reden staat in `cause`. */
    const cause = error instanceof Error ? error.cause : undefined;
    return /permission denied|must be owner|must have|not allowed/i.test(`${String(error)} ${String(cause ?? "")}`);
  }
}

type Counts = { organisations: number; users: number };

async function countRows(db: ScriptDb): Promise<Counts | undefined> {
  return rowsOf<Counts>(
    await db.execute(sql`
      select (select count(*)::int from organisations) as organisations,
             (select count(*)::int from users) as users`),
  )[0];
}

runScript(async () => {
  const url = directUrl();
  console.log(`Verbonden met endpoint ${describeTarget(url)}`);
  const pool = new Pool({ connectionString: url });
  const db = scriptDb(pool);
  const t = createChecker();
  try {
    t.section("1. De rol en zijn rechten");
    const role = rowsOf<{ login: boolean; superuser: boolean; createrole: boolean; createdb: boolean }>(
      await db.execute(sql`
        select rolcanlogin as login, rolsuper as superuser, rolcreaterole as createrole, rolcreatedb as createdb
        from pg_roles where rolname = ${ROLE}`),
    );
    t.check(`de rol ${ROLE} bestaat`, role.length, 1);
    t.check("en kan zelf niet inloggen, is geen superuser en maakt geen rollen of databases", role[0] ?? null, { login: false, superuser: false, createrole: false, createdb: false });

    const missing = rowsOf<{ name: string }>(
      await db.execute(sql`
        select c.relname as name
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p', 'v')
          and not (
            has_table_privilege(${ROLE}, c.oid, 'SELECT')
            and (c.relkind = 'v' or c.relname = 'audit_log'
              or (has_table_privilege(${ROLE}, c.oid, 'INSERT')
                and has_table_privilege(${ROLE}, c.oid, 'UPDATE')
                and has_table_privilege(${ROLE}, c.oid, 'DELETE')))
          )
        order by 1`),
    ).map((row) => row.name);
    t.check("elke tabel in public is te lezen en te schrijven", missing, []);

    const audit = rowsOf<{ insert: boolean; update: boolean; delete: boolean; truncate: boolean }>(
      await db.execute(sql`
        select has_table_privilege(${ROLE}, 'audit_log', 'INSERT') as insert,
               has_table_privilege(${ROLE}, 'audit_log', 'UPDATE') as update,
               has_table_privilege(${ROLE}, 'audit_log', 'DELETE') as delete,
               has_table_privilege(${ROLE}, 'audit_log', 'TRUNCATE') as truncate`),
    )[0];
    t.check("de audit log alleen aanvullen (CLAUDE.md regel 5)", audit ?? null, { insert: true, update: false, delete: false, truncate: false });

    /* `has_sequence_privilege` in een where wordt ook op niet-sequences uitgevoerd: daarom achter een case. */
    const sequences = rowsOf<{ name: string }>(
      await db.execute(sql`
        select c.relname as name
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind = 'S'
          and not (case when c.relkind = 'S' then has_sequence_privilege(${ROLE}, c.oid, 'USAGE') else true end)
        order by 1`),
    ).map((row) => row.name);
    t.check("elke sequence is te gebruiken", sequences, []);

    const connect = rowsOf<{ connect: boolean }>(await db.execute(sql`select has_database_privilege(${ROLE}, current_database(), 'CONNECT') as connect`))[0];
    t.check("de rol mag met deze database verbinden", connect?.connect ?? false, true);

    const schema = rowsOf<{ create: boolean; drizzle: boolean }>(
      await db.execute(sql`
        select has_schema_privilege(${ROLE}, 'public', 'CREATE') as create,
               has_schema_privilege(${ROLE}, 'drizzle', 'USAGE') as drizzle`),
    )[0];
    t.check("geen CREATE op public, wel de migratiestand lezen", schema ?? null, { create: false, drizzle: true });

    t.section("2. Het slot op elke tabel (CLAUDE.md regel 16)");
    const unlocked = rowsOf<{ name: string }>(
      await db.execute(sql`
        select c.relname as name
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
        order by 1`),
    ).map((row) => row.name);
    t.check("elke tabel in public heeft het slot", unlocked, []);

    const withoutRule = rowsOf<{ name: string }>(
      await db.execute(sql`
        select c.relname as name
        from pg_class c join pg_namespace n on n.oid = c.relnamespace
        where n.nspname = 'public' and c.relkind in ('r', 'p')
          and not exists (
            select 1 from pg_policies p
            where p.schemaname = 'public' and p.tablename = c.relname
              and p.policyname = ${APP_ROW_POLICY} and ${ROLE} = any (p.roles)
              and p.cmd = 'ALL' and p.qual = 'true' and p.with_check = 'true'
          )
        order by 1`),
    ).map((row) => row.name);
    t.check("en elke tabel de regel van de app, voor alle rijen", withoutRule, []);

    const ownerCounts = await countRows(db);

    t.section("3. Als de rol zelf, in een teruggedraaide transactie");
    await inRollback(db, async (tx) => {
      await tx.execute(sql`set local role app_rw`);
      const seen = await countRows(tx);
      t.check("lezen ziet dezelfde rijen als de eigenaar, door het slot heen", seen ?? null, ownerCounts ?? null);
      t.ok("en dat zijn er meer dan nul", (seen?.organisations ?? 0) > 0, "geen organisatie: draai eerst pnpm db:bootstrap");
      t.check(
        "schrijven kan door het slot heen",
        await refused(tx, sql`
          insert into rate_limits (organisation_id, key, window_start, count)
          select id, 'check-grants-probe', now(), 1 from organisations limit 1`),
        false,
      );
      const migrations = rowsOf<{ n: number }>(await tx.execute(sql`select count(*)::int as n from drizzle.__drizzle_migrations`))[0];
      t.ok("de migratiestand lezen kan", (migrations?.n ?? 0) > 0);
      t.check("een tabel aanmaken kan niet", await refused(tx, sql`create table check_grants_probe (id int)`), true);
      t.check("een kolom toevoegen kan niet", await refused(tx, sql`alter table users add column check_grants_probe int`), true);
      t.check("de audit log wijzigen kan niet", await refused(tx, sql`update audit_log set action = action where false`), true);
      t.check("de audit log legen kan niet", await refused(tx, sql`delete from audit_log where false`), true);
      t.check("een rol aanmaken kan niet", await refused(tx, sql`create role check_grants_probe`), true);
    });

    t.section("4. Een andere rol met leesrecht ziet niets");
    await inRollback(db, async (tx) => {
      /* Een tijdelijke rol, met dezelfde soort recht als de Data API van Neon: lezen, geen regel. */
      await tx.execute(sql`create role check_rls_probe nologin`);
      await tx.execute(sql`grant select on organisations, users to check_rls_probe`);
      await tx.execute(sql`grant check_rls_probe to current_user with set true`);
      await tx.execute(sql`set local role check_rls_probe`);
      t.check("met leesrecht en zonder regel: nul rijen", (await countRows(tx)) ?? null, { organisations: 0, users: 0 });
    });

    t.summary("Rechten");
  } finally {
    await pool.end();
  }
});
