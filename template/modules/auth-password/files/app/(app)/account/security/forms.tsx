/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { useActionState } from "react";
import { controlClass } from "@/components/ui/field";
import { EMPTY_FORM_STATE, firstError } from "@/components/ui/form-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { labels } from "@/lib/i18n/labels";
import { changePasswordAction, disableMfaAction } from "./actions";

export function ChangePasswordForm() {
  const [state, formAction] = useActionState(changePasswordAction, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="flex max-w-[420px] flex-col gap-3">
      <label className="text-[12px]">
        {labels.password.currentPassword}
        <input name="current" type="password" required autoComplete="current-password" className={`${controlClass} mt-1 w-full`} />
        {state.errors.current !== undefined && <span className="text-destructive mt-1 block text-[11.5px]">{state.errors.current}</span>}
      </label>
      <label className="text-[12px]">
        {labels.password.newPassword}
        <input name="password" type="password" required minLength={12} autoComplete="new-password" className={`${controlClass} mt-1 w-full`} />
        <span className="text-muted-foreground mt-1 block text-[11.5px]">{labels.password.passwordHint}</span>
      </label>
      <label className="text-[12px]">
        {labels.password.repeatPassword}
        <input name="confirmation" type="password" required autoComplete="new-password" className={`${controlClass} mt-1 w-full`} />
        {state.errors.password !== undefined && <span className="text-destructive mt-1 block text-[11.5px]">{state.errors.password}</span>}
      </label>
      <div className="flex items-center gap-3">
        <SubmitButton busyLabel={labels.form.saving}>{labels.form.save}</SubmitButton>
        {state.done !== undefined && (
          <span role="status" className="text-foreground-soft text-[12px]">
            {state.done}
          </span>
        )}
        {state.errors.form !== undefined && (
          <span role="alert" className="text-destructive text-[12px]">
            {state.errors.form}
          </span>
        )}
      </div>
    </form>
  );
}

export function DisableMfaForm() {
  const [state, formAction] = useActionState(disableMfaAction, EMPTY_FORM_STATE);
  const error = firstError(state);

  return (
    <form action={formAction} className="flex max-w-[420px] flex-col gap-3">
      <label className="text-[12px]">
        {labels.password.code}
        <input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" required className={`${controlClass} mt-1 w-full max-w-[200px]`} />
        <span className="text-muted-foreground mt-1 block text-[11.5px]">{labels.password.mfaDisableHint}</span>
      </label>
      <div className="flex items-center gap-3">
        <SubmitButton variant="secondary" busyLabel={labels.password.busy}>
          {labels.password.mfaDisable}
        </SubmitButton>
        {state.done !== undefined && (
          <span role="status" className="text-foreground-soft text-[12px]">
            {state.done}
          </span>
        )}
        {error !== undefined && (
          <span role="alert" className="text-destructive text-[12px]">
            {error}
          </span>
        )}
      </div>
    </form>
  );
}
