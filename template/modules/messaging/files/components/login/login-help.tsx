/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { useActionState } from "react";
import { submitLoginHelpAction } from "@/app/sign-in/login-help-actions";
import { controlClass, textareaClass } from "@/components/ui/field";
import { EMPTY_FORM_STATE } from "@/components/ui/form-state";
import { PopoverDisclosure } from "@/components/ui/popover-panel";
import { SubmitButton } from "@/components/ui/submit-button";
import { labels } from "@/lib/i18n/labels";

/**
 * "Lukt inloggen niet?" op het inlogscherm, via het register LOGIN_EXTRAS van de module messaging.
 * Het formulier zweeft (regel 12b), zodat het inlogscherm zelf kort blijft.
 */
export function LoginHelp() {
  const [state, formAction] = useActionState(submitLoginHelpAction, EMPTY_FORM_STATE);

  return (
    <PopoverDisclosure label={labels.messaging.loginHelpTitle} title={labels.messaging.loginHelpTitle} className="text-foreground-soft hover:text-accent-quiet cursor-pointer text-[12.5px] underline-offset-2 hover:underline" width={420}>
      {state.done !== undefined ? (
        <p role="status" className="text-[13px]">
          {state.done}
        </p>
      ) : (
        <form action={formAction} className="flex flex-col gap-3">
          <p className="text-foreground-soft text-[12.5px]">{labels.messaging.loginHelpIntro}</p>

          <label className="text-[12px]">
            {labels.messaging.loginHelpName}
            <input name="name" type="text" required maxLength={200} autoComplete="name" className={`${controlClass} mt-1 w-full`} />
            {state.errors.name !== undefined && <span className="text-destructive mt-1 block text-[11.5px]">{state.errors.name}</span>}
          </label>

          <label className="text-[12px]">
            {labels.messaging.loginHelpEmail}
            <input name="email" type="email" required maxLength={320} autoComplete="email" className={`${controlClass} mt-1 w-full`} />
            {state.errors.email !== undefined && <span className="text-destructive mt-1 block text-[11.5px]">{state.errors.email}</span>}
          </label>

          <label className="text-[12px]">
            {labels.messaging.loginHelpMessage}
            <textarea name="message" required rows={4} maxLength={2000} className={`${textareaClass} mt-1 w-full`} />
            {state.errors.message !== undefined && (
              <span role="alert" className="text-destructive mt-1 block text-[11.5px]">
                {state.errors.message}
              </span>
            )}
          </label>

          {/* De honingpot: een mens ziet dit veld niet en laat het leeg; een robot vult alles in. */}
          <input name="website" type="text" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />

          <div>
            <SubmitButton busyLabel={labels.messaging.loginHelpSending}>{labels.messaging.loginHelpSend}</SubmitButton>
          </div>
        </form>
      )}
    </PopoverDisclosure>
  );
}
