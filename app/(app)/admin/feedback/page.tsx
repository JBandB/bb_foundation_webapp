/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { notFound } from "next/navigation";
import { PageBody, Section } from "@/components/page-body";
import { PageHeader } from "@/components/page-header";
import { DataTable, EmptyRow, Td, Th, Thead, Tr } from "@/components/ui/table";
import { listFeedback } from "@/lib/admin/feedback";
import { can } from "@/lib/auth/can";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { formatInstant } from "@/lib/domain/dates";
import { labels } from "@/lib/i18n/labels";

/** Wat gebruikers over de tool hebben gemeld, nieuwste bovenaan. */
export const metadata = { title: labels.feedback.title };

export default async function FeedbackPage() {
  const actor = await requireSession();
  if (!can(actor, "admin:system")) notFound();

  const rows = await listFeedback(getDb(), actor);

  return (
    <>
      <PageHeader eyebrow={labels.admin.eyebrow} title={labels.feedback.title} />

      <PageBody>
        <Section title={labels.feedback.title} intro={labels.feedback.intro}>
          <DataTable minWidth={720}>
            <Thead>
              <Th>{labels.feedback.columnWhen}</Th>
              <Th>{labels.feedback.columnWho}</Th>
              <Th>{labels.feedback.columnWhat}</Th>
              <Th>{labels.feedback.columnWhere}</Th>
            </Thead>
            <tbody>
              {rows.length === 0 && <EmptyRow columns={4}>{labels.feedback.empty}</EmptyRow>}
              {rows.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <span className="num whitespace-nowrap">{formatInstant(row.createdAt)}</span>
                  </Td>
                  <Td>{row.userName}</Td>
                  <Td>
                    <div className="font-semibold">{row.title}</div>
                    <p className="text-foreground-soft mt-1 max-w-[60ch] whitespace-pre-line">{row.body}</p>
                  </Td>
                  <Td>
                    <span className="num text-muted-foreground">{row.pagePath}</span>
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
