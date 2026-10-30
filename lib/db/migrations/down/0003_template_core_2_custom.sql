-- Terugweg van de custom migratie van core, schemaversie 2: de rechten van app_rw weer in. De rol
-- zelf en de regels op de tabellen gaan weg in de terugweg van de gegenereerde migratie ervoor.
--
-- Let op: de app moet daarna weer als eigenaar verbinden (DATABASE_URL_APP weg uit Vercel en uit
-- .env.local), anders verliest hij hier zijn rechten.
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM app_rw;
--> statement-breakpoint
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM app_rw;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM app_rw;
--> statement-breakpoint
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM app_rw;
--> statement-breakpoint
REVOKE ALL ON drizzle.__drizzle_migrations FROM app_rw;
--> statement-breakpoint
REVOKE USAGE ON SCHEMA drizzle FROM app_rw;
--> statement-breakpoint
REVOKE USAGE ON SCHEMA public FROM app_rw;
--> statement-breakpoint
DO $$
BEGIN
  EXECUTE format('REVOKE CONNECT ON DATABASE %I FROM app_rw', current_database());
END
$$;
--> statement-breakpoint
REVOKE app_rw FROM CURRENT_USER;
