-- Terugweg van 0001_core_guards.sql: de triggers, de functie en de index weg.
-- De rechten op audit_log blijven ingetrokken; dat raakt niemand en terugzetten is een
-- GRANT die een eigenaar niet nodig heeft.

DROP TRIGGER IF EXISTS "audit_log_no_delete" ON "audit_log";--> statement-breakpoint
DROP TRIGGER IF EXISTS "audit_log_no_update" ON "audit_log";--> statement-breakpoint
DROP FUNCTION IF EXISTS "audit_log_is_append_only"();--> statement-breakpoint
DROP INDEX IF EXISTS "one_organisation";
