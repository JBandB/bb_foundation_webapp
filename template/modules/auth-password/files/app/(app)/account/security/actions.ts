/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/form-state";
import { changePassword, confirmMfaSetup, disableMfa, type PasswordResult } from "@/lib/auth/password/accounts";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";

export async function changePasswordAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  const result = await changePassword(getDb(), actor, String(form.get("current") ?? ""), String(form.get("password") ?? ""), String(form.get("confirmation") ?? ""));
  return outcome(result, labels.password.passwordChanged);
}

export async function confirmMfaAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  const result = await confirmMfaSetup(getDb(), actor, String(form.get("code") ?? ""));
  if (result.ok) revalidatePath("/account/security");
  return outcome(result, labels.password.mfaOn);
}

export async function disableMfaAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  const result = await disableMfa(getDb(), actor, String(form.get("code") ?? ""));
  if (result.ok) revalidatePath("/account/security");
  return outcome(result, labels.password.mfaDisabled);
}

function outcome(result: PasswordResult, done: string): FormState {
  if (result.ok) return { errors: {}, done };
  switch (result.problem) {
    case "expired":
      return { errors: { form: labels.password.mfaExpired } };
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
