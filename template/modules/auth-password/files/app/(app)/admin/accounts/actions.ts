/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use server";

import { revalidatePath } from "next/cache";
import type { FormState } from "@/components/ui/form-state";
import { inviteUser, resendInvite, resetMfa, sendResetLink, setActive, setRoles, type AdminResult } from "@/lib/auth/password/admin";
import { appOrigin } from "@/lib/auth/password/origin";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";
import { kickOutbox } from "@/lib/messaging/kick";

const PATH = "/admin/accounts";

export async function inviteAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  const email = String(form.get("email") ?? "");
  const result = await inviteUser(getDb(), actor, { email, displayName: form.get("displayName"), roles: form.getAll("roles").map(String) }, await appOrigin());
  if (!result.ok) return outcome(result);
  kickOutbox();
  revalidatePath(PATH);
  return { errors: {}, done: labels.password.inviteSent(email.trim().toLowerCase()) };
}

export async function setRolesAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  const result = await setRoles(getDb(), actor, String(form.get("id") ?? ""), form.getAll("roles").map(String));
  if (!result.ok) return outcome(result);
  revalidatePath(PATH);
  return { errors: {}, done: labels.password.rolesSaved };
}

export async function setActiveAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  const active = form.get("active") === "true";
  const result = await setActive(getDb(), actor, String(form.get("id") ?? ""), active);
  if (!result.ok) return outcome(result);
  revalidatePath(PATH);
  return { errors: {}, done: active ? labels.password.reactivated : labels.password.deactivated };
}

export async function resetMfaAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  const result = await resetMfa(getDb(), actor, String(form.get("id") ?? ""));
  if (!result.ok) return outcome(result);
  revalidatePath(PATH);
  return { errors: {}, done: labels.password.mfaReset };
}

export async function sendResetAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  const result = await sendResetLink(getDb(), actor, String(form.get("id") ?? ""), await appOrigin());
  if (!result.ok) return outcome(result);
  kickOutbox();
  return { errors: {}, done: labels.password.resetSent };
}

export async function resendInviteAction(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  const result = await resendInvite(getDb(), actor, String(form.get("id") ?? ""), await appOrigin());
  if (!result.ok) return outcome(result);
  kickOutbox();
  return { errors: {}, done: labels.password.resetSent };
}

function outcome(result: Extract<AdminResult, { ok: false }>): FormState {
  switch (result.problem) {
    case "exists":
      return { errors: { email: labels.password.inviteExists } };
    case "lastAdmin":
      return { errors: { form: labels.password.rolesLastAdmin } };
    case "self":
      return { errors: { form: labels.password.deactivateSelf } };
    case "notFound":
      return { errors: { form: labels.password.notFound } };
    default:
      return { errors: { form: labels.form.required } };
  }
}
