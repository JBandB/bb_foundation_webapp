/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { useFormStatus } from "react-dom";
import { labels } from "@/lib/i18n/labels";
import { buttonClass, type ButtonVariant } from "./button";

/**
 * Een verzendknop die weet dat hij bezig is.
 *
 * `useFormStatus` leest de status van het `<form>` waar deze knop in zit. Het moet daarom een aparte
 * clientcomponent zijn: in het formulier zelf is de status er nog niet.
 *
 * **Waarom dit meer is dan een detail.** Een server action doet een rondje naar de server en terug.
 * Zonder terugkoppeling staat de knop stil, denkt de gebruiker dat hij mis heeft geklikt, en klikt hij
 * nog een keer. De knop gaat daarom op `disabled` zodra hij bezig is. De bescherming tegen dubbel
 * aanmaken hangt hier niet van af maar van een unieke sleutel in de database.
 */
export function SubmitButton({
  children,
  variant = "primary",
  busyLabel = labels.form.busy,
  className = "",
}: {
  children: React.ReactNode;
  variant?: ButtonVariant;
  busyLabel?: string;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={buttonClass(variant, className)}>
      {pending ? busyLabel : children}
    </button>
  );
}
