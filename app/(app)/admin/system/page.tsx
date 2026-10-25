/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { notFound } from "next/navigation";
import { PageBody, Section } from "@/components/page-body";
import { PageHeader } from "@/components/page-header";
import { Chip, type ChipTone } from "@/components/ui/chip";
import { DataTable, EmptyRow, Td, Th, Thead, Tr } from "@/components/ui/table";
import { can } from "@/lib/auth/can";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { schemaState } from "@/lib/db/schema-state";
import { deployEnvironment } from "@/lib/domain/deploy-environment";
import { withTimeout, type HealthStatus } from "@/lib/integrations/health";
import { labels } from "@/lib/i18n/labels";
import { HEALTH_PROVIDERS } from "@/lib/project/registry.generated";
import { APP_VERSION } from "@/lib/version";

/**
 * Systeem: de versie, de omgeving, of de database bij de code past, en per koppeling of hij werkt.
 * De eerste plek om te kijken als iets niet werkt, in plaats van de laatste.
 */
export const metadata = { title: labels.system.title };

const TONES: Record<HealthStatus, ChipTone> = { ok: "success", warning: "warning", error: "danger", off: "neutral" };

export default async function SystemPage() {
  const actor = await requireSession();
  if (!can(actor, "admin:system")) notFound();

  const [schema, health] = await Promise.all([
    schemaState(getDb()),
    Promise.all(HEALTH_PROVIDERS.map(async (provider) => ({ name: provider.name, report: await withTimeout(provider.check) }))),
  ]);

  const statusLabel: Record<HealthStatus, string> = {
    ok: labels.system.statusOk,
    warning: labels.system.statusWarning,
    error: labels.system.statusError,
    off: labels.system.statusOff,
  };

  return (
    <>
      <PageHeader eyebrow={labels.admin.eyebrow} title={labels.system.title} />

      <PageBody>
        <Section title={labels.system.title} intro={labels.system.intro}>
          <dl className="border-border bg-card grid max-w-[640px] grid-cols-[auto_1fr] gap-x-6 gap-y-2 rounded-lg border p-4 text-[13px]">
            <dt className="text-muted-foreground">{labels.system.version}</dt>
            <dd className="num">{APP_VERSION}</dd>
            <dt className="text-muted-foreground">{labels.system.environment}</dt>
            <dd>{labels.system.environmentNames[deployEnvironment()]}</dd>
            <dt className="text-muted-foreground">{labels.system.schema}</dt>
            <dd className="flex flex-wrap items-center gap-2">
              {schema.applied === null ? (
                <Chip tone="warning">{labels.system.schemaUnknown}</Chip>
              ) : schema.behind ? (
                <Chip tone="danger">{labels.system.schemaBehind(schema.applied, schema.expected)}</Chip>
              ) : (
                <Chip tone="success">{labels.system.schemaOk(schema.applied, schema.latest)}</Chip>
              )}
            </dd>
          </dl>
        </Section>

        <Section title={labels.system.integrationsTitle} intro={labels.system.integrationsIntro}>
          <DataTable minWidth={480}>
            <Thead>
              <Th>{labels.system.integrationsTitle}</Th>
              <Th>{labels.system.statusOk}</Th>
            </Thead>
            <tbody>
              {health.length === 0 && <EmptyRow columns={2}>{labels.system.integrationsNone}</EmptyRow>}
              {health.map(({ name, report }) => (
                <Tr key={name}>
                  <Td>{name}</Td>
                  <Td>
                    <span className="flex flex-wrap items-center gap-2">
                      <Chip tone={TONES[report.status]}>{statusLabel[report.status]}</Chip>
                      <span className="text-muted-foreground">{report.detail}</span>
                    </span>
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
