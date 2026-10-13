/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import Link from "next/link";
import { useActionState } from "react";
import { controlClass } from "@/components/ui/field";
import { EMPTY_FORM_STATE, type FormState } from "@/components/ui/form-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { labels } from "@/lib/i18n/labels";

/**
 * Tweestapsverificatie instellen: de QR-code (als SVG uit de server, inline als data-URL), het geheim
 * voor wie niet kan scannen, en het veld voor de eerste code. Na afloop de bevestiging.
 */
export function MfaCodeForm({ action, qrSvg, secret, doneLink }: { action: (previous: FormState, form: FormData) => Promise<FormState>; qrSvg: string; secret: string; doneLink?: { href: string; label: string } }) {
  const [state, formAction] = useActionState(action, EMPTY_FORM_STATE);

  if (state.done !== undefined) {
    return (
      <div className="flex flex-col gap-4">
        <p role="status" className="text-[14px]">
          {state.done}
        </p>
        {doneLink !== undefined && (
          <Link href={doneLink.href} className="text-accent-quiet text-[13px] underline-offset-2 hover:underline">
            {doneLink.label}
          </Link>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <p className="text-foreground-soft text-[13px]">{labels.password.mfaIntro}</p>
      <div className="flex flex-wrap items-start gap-5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img alt="" width={192} height={192} className="rounded-md bg-white p-2" src={`data:image/svg+xml;utf8,${encodeURIComponent(qrSvg)}`} />
        <div className="min-w-0 text-[12px]">
          <p className="text-muted-foreground">{labels.password.mfaSecret}</p>
          <code className="num mt-1 block break-all text-[13px]">{secret.replace(/(.{4})/g, "$1 ").trim()}</code>
        </div>
      </div>
      <label className="text-[12px]">
        {labels.password.code}
        <input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" required className={`${controlClass} mt-1 w-full max-w-[200px]`} />
        {state.errors.code !== undefined && (
          <span role="alert" className="text-destructive mt-1 block text-[11.5px]">
            {state.errors.code}
          </span>
        )}
      </label>
      {state.errors.form !== undefined && (
        <p role="alert" className="text-destructive text-[13px]">
          {state.errors.form}
        </p>
      )}
      <div>
        <SubmitButton busyLabel={labels.password.busy}>{labels.password.mfaVerify}</SubmitButton>
      </div>
    </form>
  );
}
