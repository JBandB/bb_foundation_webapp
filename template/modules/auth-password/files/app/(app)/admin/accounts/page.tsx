/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { notFound } from "next/navigation";
import { PageBody, Section } from "@/components/page-body";
import { PageHeader } from "@/components/page-header";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { PopoverDisclosure } from "@/components/ui/popover-panel";
import { DataTable, EmptyRow, Td, Th, Thead, Tr } from "@/components/ui/table";
import { can } from "@/lib/auth/can";
import { listAccounts, type AccountStatus } from "@/lib/auth/password/admin";
import { APP_ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";
import { AccountForm, InviteForm, type RoleOption } from "./forms";

export const metadata = { title: labels.password.adminTitle };

const TONES: Record<AccountStatus, ChipTone> = { active: "success", invited: "info", inactive: "neutral", locked: "danger" };

/** Beheer, Accounts: wie er in kan, met welke rol; uitnodigen via het plusje, wijzigen via Update. */
export default async function AccountsPage() {
  const actor = await requireSession();
  if (!can(actor, "admin:access")) notFound();

  const accounts = await listAccounts(getDb(), actor);
  const roleOptions: RoleOption[] = APP_ROLES.map((role) => ({ value: role, label: ROLE_LABELS[role] }));
  const statusLabel: Record<AccountStatus, string> = {
    active: labels.password.statusActive,
    invited: labels.password.statusInvited,
    inactive: labels.password.statusInactive,
    locked: labels.password.statusLocked,
  };

  return (
    <>
      <PageHeader eyebrow={labels.admin.eyebrow} title={labels.password.adminTitle} />

      <PageBody>
        <Section
          title={labels.password.adminTitle}
          intro={labels.password.adminIntro}
          actions={
            <PopoverDisclosure label={labels.password.invite} title={labels.password.invite} className="text-accent-quiet cursor-pointer text-[13px] underline-offset-2 hover:underline" width={420}>
              <InviteForm roles={roleOptions} />
            </PopoverDisclosure>
          }
        >
          <DataTable minWidth={760}>
            <Thead>
              <Th>{labels.access.columnName}</Th>
              <Th>{labels.access.columnEmail}</Th>
              <Th>{labels.access.columnRoles}</Th>
              <Th>{labels.messaging.colStatus}</Th>
              <Th>{labels.password.mfaColumn}</Th>
              <Th />
            </Thead>
            <tbody>
              {accounts.length === 0 && <EmptyRow columns={6}>{labels.access.empty}</EmptyRow>}
              {accounts.map((account) => (
                <Tr key={account.id}>
                  <Td>{account.displayName}</Td>
                  <Td>{account.email}</Td>
                  <Td>
                    <span className="flex flex-wrap gap-1">
                      {account.roles.length === 0 && <span className="text-muted-foreground">{labels.access.noRoles}</span>}
                      {account.roles.map((role) => (
                        <Chip key={role} tone="info">
                          {ROLE_LABELS[role]}
                        </Chip>
                      ))}
                    </span>
                  </Td>
                  <Td>
                    <Chip tone={TONES[account.status]}>{statusLabel[account.status]}</Chip>
                  </Td>
                  <Td>{account.mfaEnabled ? labels.password.mfaYes : labels.password.mfaNo}</Td>
                  <Td>
                    <PopoverDisclosure label={labels.ui.edit} srLabel={account.displayName} title={account.displayName} width={420}>
                      <AccountForm id={account.id} roles={roleOptions} current={account.roles} isActive={account.status !== "inactive"} isInvited={account.status === "invited"} mfaEnabled={account.mfaEnabled} />
                    </PopoverDisclosure>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </Section>
      </PageBody>
    </>
  );
}
