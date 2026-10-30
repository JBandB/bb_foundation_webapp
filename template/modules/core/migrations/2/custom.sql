-- De rechten van de rol van de app (app_rw). Zie CLAUDE.md regel 16 en lib/db/schema/rls.ts.
--
-- De rol zelf en de regel op elke tabel staan in de gegenereerde migratie hiervoor (drizzle beheert
-- de rol en de policies). Wat hier staat kan drizzle niet uitdrukken: wat de rol mag. Lezen en
-- schrijven in public, de migratiestand lezen, de audit log alleen aanvullen, en standaardrechten
-- voor elke tabel die een latere migratie aanmaakt. Geen DDL, geen rollen, geen databases: dat blijft
-- bij de eigenaar, op de directe verbinding (migraties en scripts).
--
-- De inlogrol die de app gebruikt, maak je met SQL en lid van deze rol (docs/handleiding/04-neon.md):
-- een rol uit de Neon-console wordt lid van neon_superuser en heeft dan alles weer. Lokaal doet
-- pnpm db:app-login dat voor je.

-- Verbinden met deze database: Neon geeft CONNECT niet aan iedereen. De naam uit de database zelf,
-- zodat het op elke branch klopt.
DO $$
BEGIN
  EXECUTE format('GRANT CONNECT ON DATABASE %I TO app_rw', current_database());
END
$$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO app_rw;
--> statement-breakpoint
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_rw;
--> statement-breakpoint
-- De audit log is append-only (CLAUDE.md regel 5): de trigger weigert update en delete voor iedereen,
-- en de rol van de app heeft het recht niet eens.
REVOKE UPDATE, DELETE, TRUNCATE ON audit_log FROM app_rw;
--> statement-breakpoint
GRANT USAGE, SELECT, UPDATE ON ALL SEQUENCES IN SCHEMA public TO app_rw;
--> statement-breakpoint
-- De migratiestand op Beheer, Systeem (lib/db/schema-state.ts): alleen lezen.
GRANT USAGE ON SCHEMA drizzle TO app_rw;
--> statement-breakpoint
GRANT SELECT ON drizzle.__drizzle_migrations TO app_rw;
--> statement-breakpoint
-- Elke tabel die een latere migratie aanmaakt, krijgt dezelfde rechten vanzelf. De regel van de app
-- (appRowAccess) komt wel uit het schema: dat bewaakt rls.test.ts.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_rw;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT, UPDATE ON SEQUENCES TO app_rw;
--> statement-breakpoint
-- De eigenaar mag de rol aannemen (SET ROLE), zodat pnpm check:grants de echte rechten kan toetsen.
GRANT app_rw TO CURRENT_USER WITH INHERIT FALSE, SET TRUE;
