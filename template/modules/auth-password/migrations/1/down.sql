-- Terugweg van module auth-password, schemaversie 1: de inloggegevens en de eenmalige tokens.
-- Geschreven door pnpm template:apply naast de gegenereerde migratie; zie lib/db/migrations/README.md.
drop table if exists "auth_tokens";
drop table if exists "credentials";
drop type if exists "public"."auth_token_kind";
