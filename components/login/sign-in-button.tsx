/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { useFormStatus } from "react-dom";

/**
 * De inlogknop, met terugkoppeling.
 *
 * Een statische knop leest als kapot: na de klik gebeurt er zichtbaar niets terwijl de omleiding een
 * paar tellen kan duren, en de tweede klik die daarop volgt start een tweede omleiding.
 * Clientcomponent om één reden: `useFormStatus` kan zeggen dat het formulier onderweg is. Het
 * formulier eromheen blijft een server action, dus zonder JavaScript werkt inloggen nog steeds.
 */
export function SignInButton({ label, busyLabel }: { label: string; busyLabel: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={[
        "bg-primary text-primary-foreground rounded-md border-primary w-full border px-3.5 py-2.5 font-semibold",
        "transition-colors duration-100",
        pending ? "cursor-wait opacity-70" : "hover:bg-primary-hover hover:border-primary-hover cursor-pointer active:translate-y-px",
      ].join(" ")}
    >
      {pending ? busyLabel : label}
    </button>
  );
}
