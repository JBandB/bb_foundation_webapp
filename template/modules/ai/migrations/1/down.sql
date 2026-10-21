-- Terugweg van module ai, schemaversie 1: het verbruik, de prijzen, de instellingen per prompt en hun enums.
-- Geschreven door pnpm template:apply naast de gegenereerde migratie; zie lib/db/migrations/README.md.
drop table if exists "ai_requests";
drop table if exists "ai_model_prices";
drop table if exists "ai_prompt_settings";
drop type if exists "public"."ai_request_status";
drop type if exists "public"."ai_effort";
