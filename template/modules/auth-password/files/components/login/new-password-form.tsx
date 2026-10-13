/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { controlClass } from "@/components/ui/field";
import { EMPTY_FORM_STATE, type FormState } from "@/components/ui/form-state";
import { labels } from "@/lib/i18n/labels";
import { SignInButton } from "./sign-in-button";

/** Een nieuw wachtwoord kiezen, twee keer. Na afloop de bevestiging en de weg naar het inlogscherm. */
export function NewPasswordForm({ action, submitLabel }: { action: (previous: FormState, form: FormData) => Promise<FormState>; submitLabel: string }) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);

  if (state.done !== undefined) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-[14px]">
          {state.done}
        </p>
        <Link href="/sign-in" className="text-accent-quiet text-[13px] underline-offset-2 hover:underline">
          {labels.password.backToSignIn}
        </Link>
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="text-[12px]">
        {labels.password.newPassword}
        <input name="password" type="password" required minLength={12} autoComplete="new-password" className={`${controlClass} mt-1 w-full`} />
        <span className="text-muted-foreground mt-1 block text-[11.5px]">{labels.password.passwordHint}</span>
      </label>
      <label className="text-[12px]">
        {labels.password.repeatPassword}
        <input name="confirmation" type="password" required autoComplete="new-password" className={`${controlClass} mt-1 w-full`} />
        {state.errors.password !== undefined && (
          <span role="alert" className="text-destructive mt-1 block text-[11.5px]">
            {state.errors.password}
          </span>
        )}
      </label>
      {state.errors.form !== undefined && (
        <p role="alert" className="rounded-md border-destructive/25 bg-destructive-bg text-destructive-foreground border px-3.5 py-3 text-[13px]">
          {state.errors.form}
        </p>
      )}
      <SignInButton label={submitLabel} busyLabel={labels.password.busy} />
    </form>
  );
}
