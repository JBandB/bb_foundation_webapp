CREATE ROLE "app_rw";--> statement-breakpoint
ALTER TABLE "organisations" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_log" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "user_preferences" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "rate_limits" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "tool_feedback" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "app_rw_all" ON "organisations" AS PERMISSIVE FOR ALL TO "app_rw" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_rw_all" ON "users" AS PERMISSIVE FOR ALL TO "app_rw" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_rw_all" ON "audit_log" AS PERMISSIVE FOR ALL TO "app_rw" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_rw_all" ON "user_preferences" AS PERMISSIVE FOR ALL TO "app_rw" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_rw_all" ON "rate_limits" AS PERMISSIVE FOR ALL TO "app_rw" USING (true) WITH CHECK (true);--> statement-breakpoint
CREATE POLICY "app_rw_all" ON "tool_feedback" AS PERMISSIVE FOR ALL TO "app_rw" USING (true) WITH CHECK (true);