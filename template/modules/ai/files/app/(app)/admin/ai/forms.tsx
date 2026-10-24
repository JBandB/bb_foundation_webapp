/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { useActionState, useId } from "react";
import { controlClass } from "@/components/ui/field";
import { EMPTY_FORM_STATE, firstError } from "@/components/ui/form-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { SwitchLabel } from "@/components/ui/switch";
import { labels } from "@/lib/i18n/labels";
import { savePriceAction, savePromptSettingAction } from "./actions";

const EFFORT_OPTIONS = ["low", "medium", "high"] as const;

function Status({ done, error }: { done: string | undefined; error: string | undefined }) {
  return (
    <>
      {done !== undefined && (
        <span role="status" className="text-foreground-soft text-[12px]">
          {done}
        </span>
      )}
      {error !== undefined && (
        <span role="alert" className="text-destructive text-[12px]">
          {error}
        </span>
      )}
    </>
  );
}

/** De instelling van één prompt, in het zwevende paneel achter Update. */
export function PromptSettingForm({ promptKey, enabled, model, effort, dailyLimit, models }: { promptKey: string; enabled: boolean; model: string; effort: string; dailyLimit: number; models: readonly string[] }) {
  const [state, formAction] = useActionState(savePromptSettingAction, EMPTY_FORM_STATE);
  const listId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="promptKey" value={promptKey} />
      <SwitchLabel name="enabled" label={labels.ai.settingEnabled} defaultChecked={enabled} />

      <label className="text-[12px]">
        {labels.ai.settingModel}
        <input name="model" type="text" list={listId} defaultValue={model} autoComplete="off" spellCheck={false} className={`${controlClass} mt-1 w-full`} />
        <datalist id={listId}>
          {models.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
        <span className="text-muted-foreground mt-1 block text-[11px]">{labels.ai.settingModelHint}</span>
      </label>

      <label className="text-[12px]">
        {labels.ai.settingEffort}
        <select name="effort" defaultValue={effort} className={`${controlClass} mt-1 w-full`}>
          {EFFORT_OPTIONS.map((option) => (
            <option key={option} value={option}>
              {labels.ai.effortNames[option] ?? option}
            </option>
          ))}
        </select>
        <span className="text-muted-foreground mt-1 block text-[11px]">{labels.ai.settingEffortHint}</span>
      </label>

      <label className="text-[12px]">
        {labels.ai.settingLimit}
        <input name="dailyLimit" type="text" inputMode="numeric" defaultValue={String(dailyLimit)} className={`${controlClass} mt-1 w-28`} />
      </label>

      <div className="flex items-center gap-3">
        <SubmitButton busyLabel={labels.form.saving}>{labels.ai.settingSave}</SubmitButton>
        <Status done={state.done} error={firstError(state)} />
      </div>
    </form>
  );
}

/** De prijs van één model, of een nieuw model, in het zwevende paneel. */
export function PriceForm({ model, input, output, models }: { model: string; input: string; output: string; models: readonly string[] }) {
  const [state, formAction] = useActionState(savePriceAction, EMPTY_FORM_STATE);
  const listId = useId();

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="text-[12px]">
        {labels.ai.priceModel}
        <input name="model" type="text" list={listId} defaultValue={model} readOnly={model !== ""} autoComplete="off" spellCheck={false} className={`${controlClass} mt-1 w-full`} />
        <datalist id={listId}>
          {models.map((option) => (
            <option key={option} value={option} />
          ))}
        </datalist>
      </label>
      <label className="text-[12px]">
        {labels.ai.priceInput}
        <input name="input" type="text" inputMode="decimal" defaultValue={input} className={`${controlClass} mt-1 w-32`} />
      </label>
      <label className="text-[12px]">
        {labels.ai.priceOutput}
        <input name="output" type="text" inputMode="decimal" defaultValue={output} className={`${controlClass} mt-1 w-32`} />
      </label>
      <p className="text-muted-foreground text-[11px]">{labels.ai.priceHint}</p>
      <div className="flex items-center gap-3">
        <SubmitButton busyLabel={labels.form.saving}>{labels.ai.priceSave}</SubmitButton>
        <Status done={state.done} error={firstError(state)} />
      </div>
    </form>
  );
}
