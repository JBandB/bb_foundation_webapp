/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De tabellen van de module ai. Zie template/modules/ai/claude.md en docs/modules/ai.md.
 *
 * - `ai_prompt_settings`: wat een beheerder per prompt uit de catalogus instelt: aan of uit, het
 *   model, het denkniveau en de daglimiet per persoon. Geen rij betekent uit. Een prompt die aan
 *   staat heeft altijd een model; de database dwingt dat af.
 * - `ai_model_prices`: de prijs per model in centen per miljoen tokens, voor input en voor output,
 *   ingevuld door een beheerder van de prijspagina van Anthropic. Geld is altijd centen plus valuta
 *   (CLAUDE.md regel 15); de huidige prijzen zijn hele centen per miljoen.
 * - `ai_requests`: één regel per verzoek: wie, welke prompt en versie, welk model, hoe het afliep, de
 *   tokens en de prijzen op dat moment. Nooit de inhoud: wat er naar Claude ging en terugkwam, staat
 *   hier niet. De kosten van een regel zijn tokens maal prijs, uitgerekend bij het tonen en één keer
 *   afgerond.
 *
 * `day` is de datum in de tijdzone van het project (CLAUDE.md regel 3), voor de daglimiet.
 */
import { sql } from "drizzle-orm";
import { bigint, boolean, char, check, date, index, integer, pgEnum, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { primaryKeyColumn, timestamps } from "./columns";
import { organisations } from "./organisations";
import { appRowAccess } from "./rls";
import { users } from "./users";

export const aiEffort = pgEnum("ai_effort", ["low", "medium", "high"]);
export const aiRequestStatus = pgEnum("ai_request_status", ["ok", "refused", "invalid", "failed"]);

export const aiPromptSettings = pgTable(
  "ai_prompt_settings",
  {
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    promptKey: text("prompt_key").notNull(),
    enabled: boolean("enabled").notNull().default(false),
    /** Leeg zolang er geen model gekozen is; dan kan de prompt niet aan. */
    model: text("model"),
    effort: aiEffort("effort").notNull().default("low"),
    dailyLimit: integer("daily_limit").notNull().default(20),
    ...timestamps,
  },
  (t) => [
    primaryKey({ columns: [t.organisationId, t.promptKey] }),
    check("ai_daily_limit_range", sql`${t.dailyLimit} between 0 and 10000`),
    check("ai_enabled_has_model", sql`not ${t.enabled} or ${t.model} is not null`),
    appRowAccess(),
  ],
);

export const aiModelPrices = pgTable(
  "ai_model_prices",
  {
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    model: text("model").notNull(),
    inputCentsPerMtok: bigint("input_cents_per_mtok", { mode: "number" }).notNull(),
    outputCentsPerMtok: bigint("output_cents_per_mtok", { mode: "number" }).notNull(),
    currency: char("currency", { length: 3 }).notNull().default("USD"),
    ...timestamps,
  },
  (t) => [primaryKey({ columns: [t.organisationId, t.model] }), check("ai_prices_not_negative", sql`${t.inputCentsPerMtok} >= 0 and ${t.outputCentsPerMtok} >= 0`), appRowAccess()],
);

export const aiRequests = pgTable(
  "ai_requests",
  {
    id: primaryKeyColumn(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id),
    promptKey: text("prompt_key").notNull(),
    promptVersion: integer("prompt_version").notNull(),
    model: text("model").notNull(),
    status: aiRequestStatus("status").notNull(),
    inputTokens: integer("input_tokens").notNull().default(0),
    outputTokens: integer("output_tokens").notNull().default(0),
    /** De prijzen op het moment van het verzoek; leeg als er voor dit model nog geen prijs was. */
    inputCentsPerMtok: bigint("input_cents_per_mtok", { mode: "number" }),
    outputCentsPerMtok: bigint("output_cents_per_mtok", { mode: "number" }),
    currency: char("currency", { length: 3 }),
    durationMs: integer("duration_ms").notNull().default(0),
    day: date("day").notNull(),
    /** Een korte reden bij refused, invalid of failed, zonder inhoud. */
    error: text("error"),
    ...timestamps,
  },
  (t) => [
    index("ai_requests_user_day_idx").on(t.organisationId, t.userId, t.promptKey, t.day),
    index("ai_requests_created_idx").on(t.organisationId, t.createdAt),
    check("ai_requests_tokens_not_negative", sql`${t.inputTokens} >= 0 and ${t.outputTokens} >= 0`),
    appRowAccess(),
  ],
);

export type AiPromptSettingRow = typeof aiPromptSettings.$inferSelect;
export type AiModelPriceRow = typeof aiModelPrices.$inferSelect;
export type AiRequestRow = typeof aiRequests.$inferSelect;
export type AiEffort = (typeof aiEffort.enumValues)[number];
export type AiRequestStatus = (typeof aiRequestStatus.enumValues)[number];
