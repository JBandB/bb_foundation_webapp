-- Terugweg van module messaging, schemaversie 1: de outbox, de instellingen per berichtsoort en hun enums.
-- Geschreven door pnpm template:apply naast de gegenereerde migratie; zie lib/db/migrations/README.md.
drop table if exists "notification_settings";
drop table if exists "outbox";
drop type if exists "public"."outbox_status";
drop type if exists "public"."outbox_channel";
