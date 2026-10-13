/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestResetAction } from "@/app/sign-in/password-flows-actions";
import { controlClass } from "@/components/ui/field";
import { EMPTY_FORM_STATE } from "@/components/ui/form-state";
import { labels } from "@/lib/i18n/labels";
import { SignInButton } from "./sign-in-button";

export function ResetRequestForm() {
  const [state, formAction] = useActionState(requestResetAction, EMPTY_FORM_STATE);

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
      <p className="text-foreground-soft text-[13px]">{labels.password.resetIntro}</p>
      <label className="text-[12px]">
        {labels.password.email}
        <input name="email" type="email" required autoComplete="username" className={`${controlClass} mt-1 w-full`} />
      </label>
      <SignInButton label={labels.password.resetSubmit} busyLabel={labels.password.busy} />
    </form>
  );
}
