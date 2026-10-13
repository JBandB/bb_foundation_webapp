/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { notFound } from "next/navigation";
import { PageBody, Section } from "@/components/page-body";
import { PageHeader } from "@/components/page-header";
import { Chip } from "@/components/ui/chip";
import { DataTable, EmptyRow, Td, Th, Thead, Tr } from "@/components/ui/table";
import { ACTIONS } from "@/lib/auth/actions";
import { allowedActions, can } from "@/lib/auth/can";
import { APP_ROLES, ROLE_LABELS } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { listStaff } from "@/lib/auth/user-directory";
import { getDb } from "@/lib/db/client";
import { formatInstant } from "@/lib/domain/dates";
import { labels } from "@/lib/i18n/labels";
import { PROJECT } from "@/lib/project/config.generated";

/**
 * Toegang: wie er in de tool kan, met welke rol, en wat elke rol mag.
 *
 * Bij Entra is de lijst alleen-lezen (toekennen gebeurt in de tenant); de wachtwoordmodule zet hier
 * zijn schrijfvormen bij. De matrix is de code zelf, als tabel: een recht dat hier niet staat, bestaat niet.
 */
export const metadata = { title: labels.access.title };

export default async function AccessPage() {
  const actor = await requireSession();
  if (!can(actor, "admin:access")) notFound();

  const staff = await listStaff(getDb(), actor);

  return (
    <>
      <PageHeader eyebrow={labels.admin.eyebrow} title={labels.access.title} />

      <PageBody>
        <Section title={labels.access.staffTitle} intro={PROJECT.authProvider === "entra" ? labels.access.staffIntroEntra : labels.access.staffIntroPassword}>
          <DataTable minWidth={640}>
            <Thead>
              <Th>{labels.access.columnName}</Th>
              <Th>{labels.access.columnEmail}</Th>
              <Th>{labels.access.columnRoles}</Th>
              <Th align="right">{labels.access.columnSynced}</Th>
            </Thead>
            <tbody>
              {staff.length === 0 && <EmptyRow columns={4}>{labels.access.empty}</EmptyRow>}
              {staff.map((person) => (
                <Tr key={person.id}>
                  <Td>
                    <span className="flex flex-wrap items-center gap-2">
                      {person.displayName}
                      {!person.isActive && <Chip tone="neutral">{labels.access.inactive}</Chip>}
                    </span>
                  </Td>
                  <Td>{person.email}</Td>
                  <Td>
                    <span className="flex flex-wrap gap-1">
                      {person.roles.length === 0 && <span className="text-muted-foreground">{labels.access.noRoles}</span>}
                      {person.roles.map((role) => (
                        <Chip key={role} tone="info">
                          {ROLE_LABELS[role]}
                        </Chip>
                      ))}
                    </span>
                  </Td>
                  <Td align="right">{formatInstant(person.syncedAt)}</Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </Section>

        <Section title={labels.access.matrixTitle} intro={labels.access.matrixIntro}>
          <DataTable minWidth={520}>
            <Thead>
              <Th>{labels.access.matrixAction}</Th>
              {APP_ROLES.map((role) => (
                <Th key={role} align="right">
                  {ROLE_LABELS[role]}
                </Th>
              ))}
            </Thead>
            <tbody>
              {ACTIONS.map((action) => (
                <Tr key={action}>
                  <Td>{labels.actions[action]}</Td>
                  {APP_ROLES.map((role) => (
                    <Td key={role} align="right">
                      {allowedActions(role).includes(action) ? (
                        <span className="text-accent-quiet" aria-label={ROLE_LABELS[role]}>
                          ✓
                        </span>
                      ) : (
                        <span className="text-subtle-foreground">·</span>
                      )}
                    </Td>
                  ))}
                </Tr>
              ))}
            </tbody>
          </DataTable>
        </Section>
      </PageBody>
    </>
  );
}
