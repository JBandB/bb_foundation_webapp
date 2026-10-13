/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { signInWithPassword } from "@/app/sign-in/password-actions";
import { controlClass } from "@/components/ui/field";
import { EMPTY_FORM_STATE } from "@/components/ui/form-state";
import { labels } from "@/lib/i18n/labels";
import { SignInButton } from "./sign-in-button";

/**
 * Het inlogformulier van de wachtwoordlogin. De velden zijn gecontroleerd, zodat adres en wachtwoord
 * blijven staan als de server om de code uit de app vraagt; dat veld verschijnt dan eronder.
 */
export function PasswordSignIn() {
  const [state, formAction] = useActionState(signInWithPassword, EMPTY_FORM_STATE);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const needsCode = state.errors.code !== undefined;

  return (
    <div>
      <p className="text-foreground-soft text-[14px]">{labels.password.intro}</p>
      <form action={formAction} className="mt-4 flex flex-col gap-3">
        <label className="text-[12px]">
          {labels.password.email}
          <input name="email" type="email" required autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} className={`${controlClass} mt-1 w-full`} />
        </label>
        <label className="text-[12px]">
          {labels.password.passwordField}
          <input name="password" type="password" required autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className={`${controlClass} mt-1 w-full`} />
        </label>
        {needsCode && (
          <label className="text-[12px]">
            {labels.password.code}
            <input name="code" type="text" inputMode="numeric" autoComplete="one-time-code" pattern="[0-9 ]*" required className={`${controlClass} mt-1 w-full`} />
            <span className="text-muted-foreground mt-1 block text-[11.5px]">{labels.password.codeHint}</span>
          </label>
        )}
        {state.errors.form !== undefined && (
          <p role="alert" className="rounded-md border-destructive/25 bg-destructive-bg text-destructive-foreground border px-3.5 py-3 text-[13px]">
            {state.errors.form}
          </p>
        )}
        <SignInButton label={labels.password.submit} busyLabel={labels.password.busy} />
      </form>
      <p className="mt-3 text-[12px]">
        <Link href="/sign-in/reset" className="text-foreground-soft hover:text-accent-quiet underline-offset-2 hover:underline">
          {labels.password.forgot}
        </Link>
      </p>
    </div>
  );
}
