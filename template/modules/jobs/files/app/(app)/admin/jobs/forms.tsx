/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { useActionState } from "react";
import { EMPTY_FORM_STATE, firstError } from "@/components/ui/form-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { labels } from "@/lib/i18n/labels";
import { flushJobs, retryFailed } from "./actions";

/** Eén knop, en de uitkomst eronder in platte tekst. */
export function FlushJobs() {
  const [state, formAction] = useActionState(flushJobs, EMPTY_FORM_STATE);
  const error = firstError(state);

  return (
    <div className="flex flex-col gap-1">
      <form action={formAction}>
        <SubmitButton busyLabel={labels.jobs.flushing}>{labels.jobs.flush}</SubmitButton>
      </form>
      {state.done !== undefined && (
        <p role="status" className="text-foreground-soft text-[12px]">
          {state.done}
        </p>
      )}
      {error !== undefined && (
        <p role="alert" className="text-destructive text-[12px]">
          {error}
        </p>
      )}
    </div>
  );
}

export function RetryFailed() {
  const [state, formAction] = useActionState(retryFailed, EMPTY_FORM_STATE);

  return (
    <div className="flex flex-col gap-1">
      <form action={formAction}>
        <SubmitButton variant="secondary" busyLabel={labels.jobs.flushing}>
          {labels.jobs.retry}
        </SubmitButton>
      </form>
      {state.done !== undefined && (
        <p role="status" className="text-foreground-soft text-[12px]">
          {state.done}
        </p>
      )}
    </div>
  );
}
