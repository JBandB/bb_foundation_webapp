/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use server";

import type { FormState } from "@/components/ui/form-state";
import { requireActor } from "@/lib/auth/session";
import { appendAuditLog } from "@/lib/db/audit";
import { getDb } from "@/lib/db/client";
import { toolFeedback } from "@/lib/db/schema";
import { consumeRateLimit } from "@/lib/domain/rate-limit";
import { checkFeedback, FEEDBACK_RATE } from "@/lib/domain/tool-feedback";
import { labels } from "@/lib/i18n/labels";

/**
 * Een melding over de tool opslaan. Geen `can()`: iedereen met een sessie mag iets melden, en de
 * rij hangt aan de ingelogde gebruiker. Wel een grens per persoon, want dit is een formulier dat
 * elke sessie kan raken.
 */
export async function submitToolFeedback(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  const check = checkFeedback({ title: form.get("title"), body: form.get("body"), path: form.get("path") }, { required: labels.form.required, tooLong: labels.form.tooLong });
  if (!check.ok) return { errors: check.errors };

  const db = getDb();
  const limit = await consumeRateLimit(db, { organisationId: actor.organisationId, key: `feedback:${actor.id}`, ...FEEDBACK_RATE });
  if (!limit.ok) return { errors: { body: labels.form.tooMany(limit.retryMinutes) } };

  await db.transaction(async (tx) => {
    const row = (
      await tx
        .insert(toolFeedback)
        .values({ organisationId: actor.organisationId, userId: actor.id, title: check.value.title, body: check.value.body, pagePath: check.value.path })
        .returning({ id: toolFeedback.id })
    )[0];
    if (row === undefined) throw new Error("De melding kon niet worden opgeslagen.");
    await appendAuditLog(tx, actor, { entityTable: "tool_feedback", entityId: row.id, action: "insert", after: { title: check.value.title, path: check.value.path } });
  });

  return { errors: {}, done: labels.toolFeedback.thanks };
}
