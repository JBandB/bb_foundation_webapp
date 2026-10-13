-- Terugweg van 0000_core.sql.
-- Tabellen van afhankelijk naar onafhankelijk, zodat geen foreign key in de weg zit.

DROP TABLE IF EXISTS "tool_feedback";--> statement-breakpoint
DROP TABLE IF EXISTS "user_preferences";--> statement-breakpoint
DROP TABLE IF EXISTS "rate_limits";--> statement-breakpoint
DROP TABLE IF EXISTS "audit_log";--> statement-breakpoint
DROP TABLE IF EXISTS "users";--> statement-breakpoint
DROP TABLE IF EXISTS "organisations";
