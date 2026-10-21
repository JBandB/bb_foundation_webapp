/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/form-state";
import { savePrice, savePromptSetting } from "@/lib/ai/settings";
import { assertCan } from "@/lib/auth/can";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";

export async function savePromptSettingAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin:ai");
  const result = await savePromptSetting(
    getDb(),
    actor,
    {
      promptKey: String(form.get("promptKey") ?? ""),
      enabled: form.get("enabled") === "on",
      model: String(form.get("model") ?? ""),
      effort: String(form.get("effort") ?? ""),
      dailyLimit: String(form.get("dailyLimit") ?? ""),
    },
    labels.ai.settingErrors,
  );
  if (!result.ok) return { errors: result.errors };
  revalidatePath("/admin/ai");
  return { errors: {}, done: labels.ai.settingSaved };
}

export async function savePriceAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin:ai");
  const result = await savePrice(
    getDb(),
    actor,
    { model: String(form.get("model") ?? ""), input: String(form.get("input") ?? ""), output: String(form.get("output") ?? "") },
    labels.ai.priceErrors,
  );
  if (!result.ok) return { errors: result.errors };
  revalidatePath("/admin/ai");
  return { errors: {}, done: labels.ai.priceSaved };
}
