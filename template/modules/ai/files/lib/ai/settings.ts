/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wat een beheerder instelt onder Beheer, AI: per prompt aan of uit, het model, het denkniveau en de
 * daglimiet per persoon, en per model de prijzen. Niets hiervan staat in de code. Geen rij betekent:
 * de prompt staat uit. Schrijven kan alleen met het recht `admin:ai` en laat een auditregel achter.
 */
import { and, eq, sql } from "drizzle-orm";
import type { Actor } from "@/lib/auth/actor";
import { assertCan } from "@/lib/auth/can";
import { appendAuditLog } from "@/lib/db/audit";
import type { DbOrTransaction } from "@/lib/db/client";
import { aiModelPrices, aiPromptSettings, type AiEffort } from "@/lib/db/schema";
import { DEFAULT_CURRENCY, parsePrice } from "./cost";
import { EFFORTS, isModelId } from "./models";
import { AI_PROMPTS, promptFor } from "./prompts";

export const DEFAULT_DAILY_LIMIT = 20;

export interface PromptSetting {
  readonly promptKey: string;
  readonly enabled: boolean;
  readonly model: string | null;
  readonly effort: AiEffort;
  readonly dailyLimit: number;
  /** Nog nooit door een beheerder aangeraakt. */
  readonly isDefault: boolean;
}

export interface StoredPromptSetting {
  readonly promptKey: string;
  readonly enabled: boolean;
  readonly model: string | null;
  readonly effort: AiEffort;
  readonly dailyLimit: number;
}

/** Puur: de rijen uit de database over de catalogus heen gelegd. Een prompt zonder rij staat uit. */
export function mergePromptSettings(rows: readonly StoredPromptSetting[]): readonly PromptSetting[] {
  return AI_PROMPTS.map((prompt) => {
    const stored = rows.find((row) => row.promptKey === prompt.key);
    return stored === undefined
      ? { promptKey: prompt.key, enabled: false, model: null, effort: prompt.defaultEffort, dailyLimit: DEFAULT_DAILY_LIMIT, isDefault: true }
      : { ...stored, isDefault: false };
  });
}

const settingColumns = { promptKey: aiPromptSettings.promptKey, enabled: aiPromptSettings.enabled, model: aiPromptSettings.model, effort: aiPromptSettings.effort, dailyLimit: aiPromptSettings.dailyLimit };

export async function loadPromptSettings(db: DbOrTransaction, organisationId: string): Promise<readonly PromptSetting[]> {
  const rows = await db.select(settingColumns).from(aiPromptSettings).where(eq(aiPromptSettings.organisationId, organisationId));
  return mergePromptSettings(rows);
}

export async function loadPromptSetting(db: DbOrTransaction, organisationId: string, promptKey: string): Promise<PromptSetting | undefined> {
  return (await loadPromptSettings(db, organisationId)).find((setting) => setting.promptKey === promptKey);
}

export interface PromptSettingInput {
  readonly promptKey: string;
  readonly enabled: boolean;
  readonly model: string;
  readonly effort: string;
  readonly dailyLimit: string;
}

export interface PromptSettingTexts {
  readonly unknownPrompt: string;
  readonly badModel: string;
  readonly modelRequired: string;
  readonly badEffort: string;
  readonly badLimit: string;
}

export type SaveResult = { readonly ok: true } | { readonly ok: false; readonly errors: Readonly<Record<string, string>> };

const isEffort = (value: string): value is AiEffort => (EFFORTS as readonly string[]).includes(value);

export async function savePromptSetting(db: DbOrTransaction, actor: Actor, input: PromptSettingInput, texts: PromptSettingTexts): Promise<SaveResult> {
  assertCan(actor, "admin:ai");
  if (promptFor(input.promptKey) === undefined) return { ok: false, errors: { promptKey: texts.unknownPrompt } };
  const model = input.model.trim();
  if (model !== "" && !isModelId(model)) return { ok: false, errors: { model: texts.badModel } };
  if (input.enabled && model === "") return { ok: false, errors: { model: texts.modelRequired } };
  if (!isEffort(input.effort)) return { ok: false, errors: { effort: texts.badEffort } };
  const limitText = input.dailyLimit.trim();
  if (!/^\d{1,5}$/.test(limitText) || Number(limitText) > 10_000) return { ok: false, errors: { dailyLimit: texts.badLimit } };

  const where = and(eq(aiPromptSettings.organisationId, actor.organisationId), eq(aiPromptSettings.promptKey, input.promptKey));
  const before = (await db.select(settingColumns).from(aiPromptSettings).where(where).limit(1))[0];
  const after = { promptKey: input.promptKey, enabled: input.enabled, model: model === "" ? null : model, effort: input.effort, dailyLimit: Number(limitText) };

  await db
    .insert(aiPromptSettings)
    .values({ organisationId: actor.organisationId, ...after })
    .onConflictDoUpdate({ target: [aiPromptSettings.organisationId, aiPromptSettings.promptKey], set: { ...after, updatedAt: sql`now()` } });
  await appendAuditLog(db, actor, {
    entityTable: "ai_prompt_settings",
    entityId: actor.organisationId,
    action: before === undefined ? "insert" : "update",
    ...(before === undefined ? {} : { before }),
    after,
  });
  return { ok: true };
}

export interface ModelPrice {
  readonly model: string;
  readonly inputCentsPerMtok: number;
  readonly outputCentsPerMtok: number;
  readonly currency: string;
}

const priceColumns = { model: aiModelPrices.model, inputCentsPerMtok: aiModelPrices.inputCentsPerMtok, outputCentsPerMtok: aiModelPrices.outputCentsPerMtok, currency: aiModelPrices.currency };

export async function loadPrices(db: DbOrTransaction, organisationId: string): Promise<readonly ModelPrice[]> {
  return db.select(priceColumns).from(aiModelPrices).where(eq(aiModelPrices.organisationId, organisationId)).orderBy(aiModelPrices.model);
}

export async function priceFor(db: DbOrTransaction, organisationId: string, model: string): Promise<ModelPrice | undefined> {
  return (await db.select(priceColumns).from(aiModelPrices).where(and(eq(aiModelPrices.organisationId, organisationId), eq(aiModelPrices.model, model))).limit(1))[0];
}

export interface PriceInput {
  readonly model: string;
  readonly input: string;
  readonly output: string;
}

export interface PriceTexts {
  readonly badModel: string;
  readonly badPrice: string;
}

export async function savePrice(db: DbOrTransaction, actor: Actor, input: PriceInput, texts: PriceTexts): Promise<SaveResult> {
  assertCan(actor, "admin:ai");
  const model = input.model.trim();
  if (!isModelId(model)) return { ok: false, errors: { model: texts.badModel } };
  const inputPrice = parsePrice(input.input);
  if (!inputPrice.ok) return { ok: false, errors: { input: texts.badPrice } };
  const outputPrice = parsePrice(input.output);
  if (!outputPrice.ok) return { ok: false, errors: { output: texts.badPrice } };

  const before = await priceFor(db, actor.organisationId, model);
  const after = { model, inputCentsPerMtok: inputPrice.cents, outputCentsPerMtok: outputPrice.cents, currency: DEFAULT_CURRENCY };
  await db
    .insert(aiModelPrices)
    .values({ organisationId: actor.organisationId, ...after })
    .onConflictDoUpdate({ target: [aiModelPrices.organisationId, aiModelPrices.model], set: { ...after, updatedAt: sql`now()` } });
  await appendAuditLog(db, actor, {
    entityTable: "ai_model_prices",
    entityId: actor.organisationId,
    action: before === undefined ? "insert" : "update",
    ...(before === undefined ? {} : { before }),
    after,
  });
  return { ok: true };
}
