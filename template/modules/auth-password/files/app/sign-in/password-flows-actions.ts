/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use server";

import type { FormState } from "@/components/ui/form-state";
import { acceptInvite, completeReset, confirmMfaSetupByToken, requestReset, type PasswordResult } from "@/lib/auth/password/accounts";
import { appOrigin } from "@/lib/auth/password/origin";
import { getDb } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";
import { kickOutbox } from "@/lib/messaging/kick";

/**
 * De stappen zonder sessie: een herstelkoppeling vragen, een nieuw wachtwoord kiezen, een uitnodiging
 * aannemen, tweestapsverificatie bevestigen. Elk van deze vier is bewust anoniem: het token in de
 * koppeling is de identiteit, en `lib/auth/password/accounts.ts` toetst dat token en de rem.
 */

/* session-first: een herstelkoppeling vragen heeft geen sessie; het adres wordt niet bevestigd. */
export async function requestResetAction(_previous: FormState, form: FormData): Promise<FormState> {
  await requestReset(getDb(), String(form.get("email") ?? ""), await appOrigin());
  kickOutbox();
  /* Altijd dezelfde uitkomst, of het adres nu bestaat of niet. */
  return { errors: {}, done: labels.password.resetDone };
}

/* session-first: het token uit de mail is de identiteit; completeReset toetst het. */
export async function completeResetAction(token: string, _previous: FormState, form: FormData): Promise<FormState> {
  const result = await completeReset(getDb(), token, String(form.get("password") ?? ""), String(form.get("confirmation") ?? ""));
  return outcome(result, labels.password.passwordSet, labels.password.resetExpired);
}

/* session-first: het token uit de uitnodiging is de identiteit; acceptInvite toetst het. */
export async function acceptInviteAction(token: string, _previous: FormState, form: FormData): Promise<FormState> {
  const result = await acceptInvite(getDb(), token, String(form.get("password") ?? ""), String(form.get("confirmation") ?? ""));
  return outcome(result, labels.password.inviteAccepted, labels.password.inviteExpired);
}

/* session-first: het instellen van tweestapsverificatie gebeurt vóór de eerste sessie, op een token. */
export async function confirmMfaByTokenAction(token: string, _previous: FormState, form: FormData): Promise<FormState> {
  const result = await confirmMfaSetupByToken(getDb(), token, String(form.get("code") ?? ""));
  return outcome(result, labels.password.mfaEnabled, labels.password.mfaExpired);
}

function outcome(result: PasswordResult, done: string, expired: string): FormState {
  if (result.ok) return { errors: {}, done };
  switch (result.problem) {
    case "expired":
      return { errors: { form: expired } };
    case "wrongCode":
      return { errors: { code: labels.password.mfaWrongCode } };
    case "wrongCurrent":
      return { errors: { current: labels.password.wrongCurrentPassword } };
    case "required":
      return { errors: { form: labels.password.mfaCannotDisable } };
    default:
      return { errors: { password: labels.password.passwordErrors[result.problem] } };
  }
}
