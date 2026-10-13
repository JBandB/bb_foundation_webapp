/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { useActionState } from "react";
import { controlClass } from "@/components/ui/field";
import { EMPTY_FORM_STATE, firstError, type FormState } from "@/components/ui/form-state";
import { SubmitButton } from "@/components/ui/submit-button";
import { SwitchLabel } from "@/components/ui/switch";
import { labels } from "@/lib/i18n/labels";
import { inviteAction, resendInviteAction, resetMfaAction, sendResetAction, setActiveAction, setRolesAction } from "./actions";

export interface RoleOption {
  readonly value: string;
  readonly label: string;
}

function Outcome({ state }: { state: FormState }) {
  const error = firstError(state);
  return (
    <>
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
    </>
  );
}

export function InviteForm({ roles }: { roles: readonly RoleOption[] }) {
  const [state, formAction] = useActionState(inviteAction, EMPTY_FORM_STATE);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <label className="text-[12px]">
        {labels.password.inviteName}
        <input name="displayName" type="text" required maxLength={200} className={`${controlClass} mt-1 w-full`} />
      </label>
      <label className="text-[12px]">
        {labels.password.inviteEmail}
        <input name="email" type="email" required maxLength={320} className={`${controlClass} mt-1 w-full`} />
        {state.errors.email !== undefined && <span className="text-destructive mt-1 block text-[11.5px]">{state.errors.email}</span>}
      </label>
      <fieldset className="flex flex-col gap-1 text-[12px]">
        <legend className="mb-1">{labels.password.inviteRoles}</legend>
        {roles.map((role) => (
          <SwitchLabel key={role.value} name="roles" value={role.value} label={role.label} />
        ))}
      </fieldset>
      <div className="flex items-center gap-3">
        <SubmitButton busyLabel={labels.password.busy}>{labels.password.inviteSend}</SubmitButton>
        <Outcome state={state} />
      </div>
    </form>
  );
}

export function AccountForm({ id, roles, current, isActive, isInvited, mfaEnabled }: { id: string; roles: readonly RoleOption[]; current: readonly string[]; isActive: boolean; isInvited: boolean; mfaEnabled: boolean }) {
  const [rolesState, rolesAction] = useActionState(setRolesAction, EMPTY_FORM_STATE);
  const [activeState, activeAction] = useActionState(setActiveAction, EMPTY_FORM_STATE);
  const [mfaState, mfaAction] = useActionState(resetMfaAction, EMPTY_FORM_STATE);
  const [mailState, mailAction] = useActionState(isInvited ? resendInviteAction : sendResetAction, EMPTY_FORM_STATE);

  return (
    <div className="flex flex-col gap-5">
      <form action={rolesAction} className="flex flex-col gap-2">
        <input type="hidden" name="id" value={id} />
        <fieldset className="flex flex-col gap-1 text-[12px]">
          <legend className="mb-1">{labels.password.rolesTitle}</legend>
          {roles.map((role) => (
            <SwitchLabel key={role.value} name="roles" value={role.value} label={role.label} defaultChecked={current.includes(role.value)} />
          ))}
        </fieldset>
        <div className="flex items-center gap-3">
          <SubmitButton busyLabel={labels.form.saving}>{labels.password.rolesSave}</SubmitButton>
          <Outcome state={rolesState} />
        </div>
      </form>

      <div className="flex flex-wrap items-center gap-3">
        <form action={activeAction}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="active" value={isActive ? "false" : "true"} />
          <SubmitButton variant={isActive ? "danger" : "secondary"} busyLabel={labels.password.busy}>
            {isActive ? labels.password.deactivate : labels.password.reactivate}
          </SubmitButton>
        </form>
        <Outcome state={activeState} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <form action={mailAction}>
          <input type="hidden" name="id" value={id} />
          <SubmitButton variant="secondary" busyLabel={labels.password.busy}>
            {isInvited ? labels.password.resendInvite : labels.password.sendReset}
          </SubmitButton>
        </form>
        <Outcome state={mailState} />
      </div>

      {mfaEnabled && (
        <div className="flex flex-wrap items-center gap-3">
          <form action={mfaAction}>
            <input type="hidden" name="id" value={id} />
            <SubmitButton variant="secondary" busyLabel={labels.password.busy}>
              {labels.password.resetMfa}
            </SubmitButton>
          </form>
          <Outcome state={mfaState} />
        </div>
      )}
    </div>
  );
}
