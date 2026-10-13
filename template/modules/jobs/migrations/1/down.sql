-- Terugweg van module jobs, schemaversie 1: de tabel jobs en zijn status-enum.
-- Geschreven door pnpm template:apply naast de gegenereerde migratie; zie lib/db/migrations/README.md.
drop table if exists "jobs";
drop type if exists "public"."job_status";
