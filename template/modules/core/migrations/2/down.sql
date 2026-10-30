-- Terugweg van de gegenereerde migratie van core, schemaversie 2: de regel van de app en het slot
-- van elke tabel in public, en daarna de rol zelf. Geschreven door pnpm template:apply naast de
-- gegenereerde migratie; zie lib/db/migrations/README.md.
--
-- Niet per tabel uitgeschreven, want welke tabellen de heenweg raakte, hangt af van welke modules
-- er op dat moment al stonden: drizzle zet de regel op elke tabel die het schema dan kent. Dit haalt
-- precies die regel overal weg, en zet het slot uit op elke tabel in public. Een eigen slot dat het
-- project zelf met een andere regel had gezet, zet je daarna met de hand terug.
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname
    FROM pg_class c
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p')
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "app_rw_all" ON %I', t.relname);
    EXECUTE format('ALTER TABLE %I DISABLE ROW LEVEL SECURITY', t.relname);
  END LOOP;
END
$$;
--> statement-breakpoint
DROP ROLE IF EXISTS app_rw;
