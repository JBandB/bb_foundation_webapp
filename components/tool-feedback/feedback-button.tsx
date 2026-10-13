/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useActionState, useEffect, useState } from "react";
import { submitToolFeedback } from "@/app/(app)/tool-feedback-actions";
import { textareaClass } from "@/components/ui/field";
import { EMPTY_FORM_STATE } from "@/components/ui/form-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { FEEDBACK_LIMITS } from "@/lib/domain/tool-feedback";
import { labels } from "@/lib/i18n/labels";

/**
 * De feedbackknop rechtsonder, op elk scherm van de tool.
 *
 * **Het paneel verhult het scherm niet.** Geen `<dialog>` en geen backdrop: het staat rechtsonder
 * naast de knop en de pagina blijft leesbaar en bruikbaar. De melding gaat meestal over wat er op dat
 * moment in beeld staat en dan moet je erbij kunnen kijken.
 *
 * **Het pad gaat automatisch mee.** Dat is wat je achteraf altijd mist en wat niemand er zelf bij
 * typt. Geen schermafbeelding en geen HTML van de pagina: dat vraagt opslag, en die komt met de
 * module files.
 *
 * **De drie naslagschermen onderin:** voordat je iets meldt, kun je zien of het al gebouwd is,
 * gepland staat of met opzet is afgewezen.
 */
export function FeedbackButton() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="fixed right-4 bottom-4 z-50 flex flex-col items-end gap-2 print:hidden">
      {open && <Panel onDone={() => setOpen(false)} />}

      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        title={labels.toolFeedback.hint}
        aria-expanded={open}
        className="bg-primary text-primary-foreground rounded-md hover:bg-primary-hover cursor-pointer px-4 py-2 text-[13px] shadow-float transition-colors duration-100 active:translate-y-px"
      >
        {open ? labels.toolFeedback.close : labels.toolFeedback.open}
      </button>
    </div>
  );
}

const linkClass = "text-muted-foreground hover:text-accent-quiet underline decoration-transparent underline-offset-2 transition-colors duration-100 hover:decoration-current";

function Panel({ onDone }: { onDone: () => void }) {
  const [state, formAction] = useActionState(submitToolFeedback, EMPTY_FORM_STATE);
  const pathname = usePathname();
  const search = useSearchParams().toString();
  const path = search === "" ? pathname : `${pathname}?${search}`;

  return (
    <div role="group" aria-label={labels.toolFeedback.title} className="border-border rounded-lg bg-popover shadow-panel flex w-[min(92vw,420px)] flex-col gap-3 border p-5">
      {state.done !== undefined ? (
        <>
          <p role="status" className="border-accent-quiet text-accent-quiet rounded-md border px-3 py-2 text-[13px]">
            {state.done}
          </p>
          <div>
            <button type="button" onClick={onDone} className="bg-primary text-primary-foreground rounded-md cursor-pointer px-4 py-2 text-[13px]">
              {labels.toolFeedback.close}
            </button>
          </div>
        </>
      ) : (
        <form action={formAction} className="flex flex-col gap-3">
          <input type="hidden" name="path" value={path} />

          <div className="flex flex-wrap items-baseline gap-x-2">
            <h2 className="text-[15px] font-semibold">{labels.toolFeedback.title}</h2>
            <span className="num text-subtle-foreground ml-auto text-[11px]">{path}</span>
          </div>

          <p className="text-muted-foreground text-[12px]">{labels.toolFeedback.intro}</p>

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold">{labels.toolFeedback.titleField}</span>
            <input
              name="title"
              type="text"
              required
              autoFocus
              maxLength={FEEDBACK_LIMITS.title}
              className="border-border-strong rounded-md bg-input focus:border-accent-quiet min-h-[40px] border px-3 text-[14px] transition-colors duration-100"
            />
            {state.errors.title !== undefined && (
              <span role="alert" className="text-destructive text-[12px]">
                {state.errors.title}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[12px] font-semibold">{labels.toolFeedback.bodyField}</span>
            <textarea name="body" required rows={4} maxLength={FEEDBACK_LIMITS.body} className={`${textareaClass} text-[14px]`} />
            {state.errors.body !== undefined && (
              <span role="alert" className="text-destructive text-[12px]">
                {state.errors.body}
              </span>
            )}
          </label>

          <div className="flex items-center gap-3">
            <SubmitButton busyLabel={labels.toolFeedback.sending}>{labels.toolFeedback.send}</SubmitButton>
            <button type="button" onClick={onDone} className="text-muted-foreground hover:text-foreground cursor-pointer text-[12px] underline">
              {labels.form.cancel}
            </button>
          </div>

          <div className="border-border mt-1 flex flex-col gap-1 border-t pt-3">
            <span className="text-muted-foreground text-[11px]">{labels.toolFeedback.lookFirst}</span>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-[12px]">
              <Link href="/about/releases" onClick={onDone} className={linkClass}>
                {labels.toolFeedback.linkReleases}
              </Link>
              <Link href="/about/roadmap" onClick={onDone} className={linkClass}>
                {labels.toolFeedback.linkRoadmap}
              </Link>
              <Link href="/about/decisions" onClick={onDone} className={linkClass}>
                {labels.toolFeedback.linkDecisions}
              </Link>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
