/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { useActionState } from "react";
import { controlClass } from "@/components/ui/field";
import { EMPTY_FORM_STATE, firstError } from "@/components/ui/form-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { SwitchLabel } from "@/components/ui/switch";
import { labels } from "@/lib/i18n/labels";
import { flushOutbox, retryOutboxMessage, saveMessageSetting } from "./actions";

export interface AudienceOption {
  readonly value: string;
  readonly label: string;
}

/** De instelling van één soort, in het zwevende paneel achter Update. */
export function MessageSettingForm({
  kind,
  enabled,
  audience,
  audiences,
  threshold,
}: {
  kind: string;
  enabled: boolean;
  audience: string;
  audiences: readonly AudienceOption[];
  /** De drempel zoals hij in het veld staat, met de eenheid ernaast; leeg als de soort er geen heeft. */
  threshold: { value: string; unit: string } | null;
}) {
  const [state, formAction] = useActionState(saveMessageSetting, EMPTY_FORM_STATE);
  const error = firstError(state);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="kind" value={kind} />
      <SwitchLabel name="enabled" label={labels.messaging.settingEnabled} defaultChecked={enabled} />

      <label className="text-[12px]">
        {labels.messaging.settingAudience}
        <select name="audience" defaultValue={audience} className={`${controlClass} mt-1 w-full`}>
          {audiences.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {threshold !== null && (
        <label className="text-[12px]">
          {labels.messaging.settingThreshold}
          <span className="mt-1 flex items-center gap-2">
            <input name="threshold" type="text" inputMode="decimal" defaultValue={threshold.value} className={`${controlClass} w-28`} />
            <span className="text-muted-foreground">{threshold.unit}</span>
          </span>
        </label>
      )}

      <div className="flex items-center gap-3">
        <SubmitButton busyLabel={labels.form.saving}>{labels.messaging.settingSave}</SubmitButton>
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

export function RetryMessage({ id }: { id: string }) {
  const [state, formAction] = useActionState(retryOutboxMessage, EMPTY_FORM_STATE);
  const error = firstError(state);

  return (
    <form action={formAction} className="flex items-center gap-3">
      <input type="hidden" name="id" value={id} />
      <SubmitButton variant="secondary" busyLabel={labels.messaging.retrying}>
        {labels.messaging.retry}
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
    </form>
  );
}

export function FlushOutbox() {
  const [state, formAction] = useActionState(flushOutbox, EMPTY_FORM_STATE);
  const error = firstError(state);

  return (
    <div className="flex flex-col gap-1">
      <form action={formAction}>
        <SubmitButton busyLabel={labels.messaging.flushing}>{labels.messaging.flush}</SubmitButton>
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
