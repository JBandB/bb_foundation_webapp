/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { useActionState } from "react";
import type { DeleteState } from "@/lib/domain/delete-state";
import { labels } from "@/lib/i18n/labels";
import { EMPTY_FORM_STATE, firstError, type FormState } from "./form-state";
import { PopoverDisclosure } from "./popover-panel";
import { SubmitButton } from "./submit-button";

/**
 * Iets verwijderen, overal op dezelfde manier.
 *
 * **Kan het niet, dan staat er geen knop maar de reden.** Die reden komt uit dezelfde domeinfunctie
 * die de server gebruikt, dus het scherm kan niets aanbieden dat daarna wordt geweigerd. "Hier hangen
 * nog drie bestellingen aan" wijst de weg; "dit kan niet" laat je zoeken.
 *
 * **Kan het wel, dan zit de knop achter een paneel dat boven de knop zweeft**, met de gevolgen erbij,
 * zodat niemand hem aanziet voor een gewone bewerking.
 *
 * **De teksten komen als parameter binnen.** Ze noemen het ding waar ze over gaan, dus ze staan per
 * domein in `labels`; de vorm eromheen staat hier, één keer.
 */
export function DeletePanel({
  state,
  action,
  fields,
  texts,
  className,
  whenBlocked = "explain",
  inline = false,
}: {
  /** Wat de domeinfunctie zegt: kan het, en wat gaat er mee. */
  state: DeleteState;
  action: (previous: FormState, form: FormData) => Promise<FormState>;
  /** Wat het formulier moet meesturen, meestal alleen het id. */
  fields: Record<string, string>;
  texts: {
    /** Op de knop die het paneel opent, en in de kop van het paneel. */
    open: string;
    /** Wat er gebeurt, in één zin. */
    intro: string;
    /** Op de knop die het doet. Een werkwoord, geen "OK". */
    confirm: string;
  };
  className?: string;
  /** `explain` zet de reden neer (detailscherm); `hide` laat hem weg (tabelcel). */
  whenBlocked?: "explain" | "hide";
  /** Zonder eigen paneel, voor gebruik ín een paneel dat al openstaat. */
  inline?: boolean;
}) {
  const [result, formAction] = useActionState(action, EMPTY_FORM_STATE);

  if (state.blocker !== undefined) {
    if (whenBlocked === "hide") return null;
    return <p className="text-muted-foreground text-[13px]">{state.blocker}</p>;
  }

  const error = firstError(result);

  const content = (
    <>
      <form action={formAction} className="flex flex-col gap-3">
        {Object.entries(fields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
        <p className="text-muted-foreground text-[13px]">{texts.intro}</p>
        {state.alsoRemoved.length > 0 && (
          <ul className="flex flex-col gap-1 text-[13px] font-semibold">
            {state.alsoRemoved.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        )}
        <div>
          <SubmitButton busyLabel={labels.form.saving} variant="danger">
            {texts.confirm}
          </SubmitButton>
        </div>
      </form>
      {error !== undefined && (
        <p role="alert" className="border-destructive text-destructive mt-3 rounded-md border px-3 py-2 text-[13px]">
          {error}
        </p>
      )}
    </>
  );

  if (inline) {
    return (
      <div className="border-border rounded-md border p-3">
        <p className="mb-2 text-[12px] font-semibold">{texts.open}</p>
        {content}
      </div>
    );
  }

  return (
    <PopoverDisclosure
      label={texts.open}
      title={texts.open}
      width={480}
      className={className ?? "hover:text-accent-quiet border-border bg-card cursor-pointer rounded-lg border px-3.5 py-2.5 text-left text-[13px] font-semibold transition-colors duration-100"}
    >
      {content}
    </PopoverDisclosure>
  );
}
