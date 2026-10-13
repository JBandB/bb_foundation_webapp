/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { notFound } from "next/navigation";
import { PageBody, Section } from "@/components/page-body";
import { PageHeader } from "@/components/page-header";
import { DataTable, EmptyRow, Td, Th, Thead, Tr } from "@/components/ui/table";
import { can } from "@/lib/auth/can";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";
import { formatMoment, isStuck, loadJobsHealth } from "@/lib/jobs/health";
import { FlushJobs, RetryFailed } from "./forms";

export const metadata = { title: labels.jobs.title };

/**
 * Beheer, Achtergrondwerk: de wachtrij per systeem en de twee knoppen. Lezen doet lib/jobs/health.ts;
 * versturen alleen de knop of de cron, nooit het openen van dit scherm.
 */
export default async function JobsPage() {
  const actor = await requireSession();
  if (!can(actor, "admin:system")) notFound();

  const lines = await loadJobsHealth(getDb(), actor.organisationId);
  const now = new Date();

  return (
    <>
      <PageHeader eyebrow={labels.admin.eyebrow} title={labels.jobs.title} />

      <PageBody>
        <Section
          title={labels.jobs.queueTitle}
          intro={labels.jobs.intro}
          actions={
            <>
              <RetryFailed />
              <FlushJobs />
            </>
          }
        >
          <DataTable minWidth={820}>
            <Thead>
              <Th>{labels.jobs.colSystem}</Th>
              <Th align="right">{labels.jobs.colPending}</Th>
              <Th align="right">{labels.jobs.colWaiting}</Th>
              <Th align="right">{labels.jobs.colFailed}</Th>
              <Th align="right">{labels.jobs.colDone}</Th>
              <Th>{labels.jobs.colLastActivity}</Th>
            </Thead>
            <tbody>
              {lines.length === 0 && <EmptyRow columns={6}>{labels.jobs.nothing}</EmptyRow>}
              {lines.map((line) => {
                const stuck = isStuck(line, now);
                return (
                  <Tr key={line.system}>
                    <Td>
                      <span className="num">{line.system}</span>
                      {stuck && <span className="text-destructive ml-2 text-[11px]">{labels.jobs.stuck}</span>}
                      {line.waitingFor !== null && <span className="text-muted-foreground mt-0.5 block text-[11px]">{line.waitingFor}</span>}
                      {line.lastError !== null && <span className="text-destructive mt-0.5 block text-[11px] leading-snug">{line.lastError}</span>}
                    </Td>
                    <Td align="right">
                      <span className={line.pending > 0 && stuck ? "text-destructive" : undefined}>{line.pending}</span>
                    </Td>
                    <Td align="right">{line.waiting}</Td>
                    <Td align="right">
                      <span className={line.failed > 0 ? "text-destructive" : undefined}>{line.failed}</span>
                    </Td>
                    <Td align="right">
                      <span className="text-muted-foreground">{line.done}</span>
                    </Td>
                    <Td>
                      <span className="text-foreground-soft text-[12px]">{line.lastActivity === null ? labels.jobs.never : formatMoment(line.lastActivity)}</span>
                      {line.oldestPending !== null && (
                        <span className="text-muted-foreground mt-0.5 block text-[11px]">
                          {labels.jobs.oldest} {formatMoment(line.oldestPending)}
                        </span>
                      )}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </DataTable>
        </Section>
      </PageBody>
    </>
  );
}
