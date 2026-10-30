/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use server";

import { headers } from "next/headers";
import type { FormState } from "@/components/ui/form-state";
import { getDb } from "@/lib/db/client";
import { callerAddress } from "@/lib/domain/rate-limit";
import { labels } from "@/lib/i18n/labels";
import { kickOutbox } from "@/lib/messaging/kick";
import { submitLoginHelp } from "@/lib/messaging/login-help";

/**
 * Het hulpformulier op het inlogscherm: zonder sessie, met de remmen uit lib/messaging/login-help.ts.
 *
 * session-first: wie niet kan inloggen heeft geen sessie; de rem per adres en het plafond vangen misbruik.
 */
export async function submitLoginHelpAction(_previous: FormState, form: FormData): Promise<FormState> {
  const requestHeaders = await headers();
  const result = await submitLoginHelp(getDb(), {
    name: form.get("name"),
    email: form.get("email"),
    message: form.get("message"),
    honeypot: form.get("website"),
    address: callerAddress(requestHeaders.get("x-forwarded-for")),
  });
  if (!result.ok) return { errors: result.errors };
  kickOutbox();
  return { errors: {}, done: labels.messaging.loginHelpDone };
}
