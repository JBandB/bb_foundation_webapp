/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use server";

import type { FormState } from "@/components/ui/form-state";
import { assertCan } from "@/lib/auth/can";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { retryFailedJobs } from "@/lib/jobs/queue";
import { processJobs } from "@/lib/jobs/run";
import { labels } from "@/lib/i18n/labels";

/**
 * De knop die nu verwerkt wat er klaarstaat. Geen bevestiging vooraf, want dit doet niets wat de
 * cron niet ook doet, en elke taak heeft een idempotentiesleutel en een lease.
 */
export async function flushJobs(_previous: FormState, _form: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin:system");
  const report = await processJobs(getDb());
  return { errors: {}, done: labels.jobs.flushDone(report) };
}

/** Mislukte taken weer klaarzetten, met een auditregel per taak. */
export async function retryFailed(_previous: FormState, _form: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "admin:system");
  const count = await retryFailedJobs(getDb(), actor);
  return { errors: {}, done: labels.jobs.retryDone(count) };
}
