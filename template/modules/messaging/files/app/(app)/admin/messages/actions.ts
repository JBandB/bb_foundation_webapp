/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/form-state";
import { assertCan } from "@/lib/auth/can";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";
import { retryMessage } from "@/lib/messaging/log";
import { sendPending } from "@/lib/messaging/send";
import { saveSetting } from "@/lib/messaging/settings";

export async function saveMessageSetting(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin:messages");
  const result = await saveSetting(
    getDb(),
    actor,
    {
      kind: String(form.get("kind") ?? ""),
      enabled: form.get("enabled") === "on",
      audience: String(form.get("audience") ?? ""),
      threshold: String(form.get("threshold") ?? ""),
    },
    labels.messaging.settingErrors,
  );
  if (!result.ok) return { errors: result.errors };
  revalidatePath("/admin/messages");
  return { errors: {}, done: labels.messaging.settingSaved };
}

export async function retryOutboxMessage(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin:messages");
  const outcome = await retryMessage(getDb(), actor, String(form.get("id") ?? ""));
  if (outcome === "notFound") return { errors: { id: labels.messaging.retryNotFound } };
  if (outcome === "notFailed") return { errors: { id: labels.messaging.retryNotFailed } };
  revalidatePath("/admin/messages");
  return { errors: {}, done: labels.messaging.retryDone };
}

export async function flushOutbox(_previous: FormState, _form: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin:messages");
  const run = await sendPending(getDb(), actor.organisationId);
  revalidatePath("/admin/messages");
  if (!run.configured) return { errors: { transport: labels.messaging.flushNotConfigured(run.missing) } };
  return { errors: {}, done: labels.messaging.flushDone(run) };
}
