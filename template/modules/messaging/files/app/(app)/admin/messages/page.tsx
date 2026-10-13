/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { notFound } from "next/navigation";
import { PageBody, Section, Stat, StatRow } from "@/components/page-body";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { controlClass } from "@/components/ui/field";
import { PopoverDisclosure } from "@/components/ui/popover-panel";
import { DataTable, EmptyRow, Td, Th, Thead, Tr } from "@/components/ui/table";
import { can } from "@/lib/auth/can";
import { ROLE_LABELS, isAppRole } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";
import { formatMoment } from "@/lib/jobs/health";
import { MESSAGE_KINDS, thresholdInput, type MessageAudience, type MessageKind } from "@/lib/messaging/kinds";
import { listUsedKinds, loadMessageLog, MESSAGE_STATUSES, toMessageStatus } from "@/lib/messaging/log";
import { loadSettings, settingFor } from "@/lib/messaging/settings";
import { FlushOutbox, MessageSettingForm, RetryMessage, type AudienceOption } from "./forms";

export const metadata = { title: labels.messaging.title };

/**
 * Beheer, Berichten: de stand, de soorten met hun instelling (Update opent een zwevend paneel), en
 * het logboek met een filter en de knop om een mislukt bericht opnieuw aan te bieden.
 */
export default async function MessagesPage({ searchParams }: { searchParams: Promise<{ kind?: string; status?: string }> }) {
  const actor = await requireSession();
  if (!can(actor, "admin:messages")) notFound();

  const params = await searchParams;
  const db = getDb();
  const status = toMessageStatus(params.status);
  const kind = params.kind !== undefined && params.kind !== "" ? params.kind : undefined;
  const [settings, usedKinds, log] = await Promise.all([loadSettings(db, actor.organisationId), listUsedKinds(db, actor), loadMessageLog(db, actor, { kind, status })]);

  return (
    <>
      <PageHeader eyebrow={labels.admin.eyebrow} title={labels.messaging.title} />

      <PageBody>
        <StatRow>
          <Stat label={labels.messaging.statPending} value={log.pending} />
          <Stat label={labels.messaging.statFailed} value={log.failed} tone={log.failed > 0 ? "bad" : "neutral"} />
          <Stat label={labels.messaging.statSent} value={log.sent} />
        </StatRow>

        <Section title={labels.messaging.kindsTitle} intro={labels.messaging.kindsIntro}>
          <DataTable minWidth={820}>
            <Thead>
              <Th>{labels.messaging.colKind}</Th>
              <Th>{labels.messaging.colChannel}</Th>
              <Th>{labels.messaging.colEnabled}</Th>
              <Th>{labels.messaging.colAudience}</Th>
              <Th>{labels.messaging.colThreshold}</Th>
              <Th />
            </Thead>
            <tbody>
              {MESSAGE_KINDS.map((messageKind) => {
                const setting = settingFor(settings, messageKind.key);
                return (
                  <Tr key={messageKind.key}>
                    <Td>
                      {kindName(messageKind.key)}
                      <span className="text-muted-foreground num ml-2 text-[11px]">{messageKind.key}</span>
                    </Td>
                    <Td>{messageKind.channel === "teams" ? labels.messaging.channelTeams : labels.messaging.channelMail}</Td>
                    <Td>
                      <Chip tone={setting.enabled ? "success" : "neutral"}>{setting.enabled ? labels.messaging.on : labels.messaging.off}</Chip>
                      {setting.isDefault && <span className="text-muted-foreground ml-2 text-[11px]">{labels.messaging.isDefault}</span>}
                    </Td>
                    <Td>{audienceLabel(setting.audience)}</Td>
                    <Td>{thresholdText(messageKind, setting.threshold)}</Td>
                    <Td>
                      <PopoverDisclosure label={labels.ui.edit} srLabel={kindName(messageKind.key)} title={kindName(messageKind.key)} width={420}>
                        <MessageSettingForm
                          kind={messageKind.key}
                          enabled={setting.enabled}
                          audience={setting.audience}
                          audiences={messageKind.audiences.map((audience): AudienceOption => ({ value: audience, label: audienceLabel(audience) }))}
                          threshold={messageKind.threshold === undefined || setting.threshold === undefined ? null : { value: thresholdInput(messageKind, setting.threshold), unit: labels.messaging.thresholdUnit[messageKind.threshold.unit] }}
                        />
                      </PopoverDisclosure>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </DataTable>
        </Section>

        <Section title={labels.messaging.logTitle} intro={labels.messaging.logIntro} actions={<FlushOutbox />}>
          <form method="get" className="mb-3 flex flex-wrap items-end gap-3 text-[12px]">
            <label>
              {labels.messaging.filterKind}
              <select name="kind" defaultValue={kind ?? ""} className={`${controlClass} mt-1 block`}>
                <option value="">{labels.messaging.filterAll}</option>
                {usedKinds.map((used) => (
                  <option key={used} value={used}>
                    {kindName(used)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              {labels.messaging.filterStatus}
              <select name="status" defaultValue={status ?? ""} className={`${controlClass} mt-1 block`}>
                <option value="">{labels.messaging.filterAll}</option>
                {MESSAGE_STATUSES.map((option) => (
                  <option key={option} value={option}>
                    {statusLabel(option)}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className={buttonClass("secondary")}>
              {labels.messaging.filterApply}
            </button>
          </form>

          <DataTable minWidth={860}>
            <Thead>
              <Th>{labels.messaging.colMoment}</Th>
              <Th>{labels.messaging.colKind}</Th>
              <Th>{labels.messaging.colTo}</Th>
              <Th>{labels.messaging.colSubject}</Th>
              <Th>{labels.messaging.colStatus}</Th>
              <Th align="right">{labels.messaging.colAttempts}</Th>
              <Th />
            </Thead>
            <tbody>
              {log.rows.length === 0 && <EmptyRow columns={7}>{labels.messaging.none}</EmptyRow>}
              {log.rows.map((row) => (
                <Tr key={row.id}>
                  <Td>
                    <span className="num text-foreground-soft">{formatMoment(row.createdAt)}</span>
                  </Td>
                  <Td>{kindName(row.kind)}</Td>
                  <Td>{row.toEmail ?? labels.messaging.teamsChannel}</Td>
                  <Td>{row.subject}</Td>
                  <Td>
                    <span className={row.status === "failed" ? "text-destructive" : undefined}>{statusLabel(row.status)}</span>
                  </Td>
                  <Td align="right">{row.attempts}</Td>
                  <Td>
                    <PopoverDisclosure label={labels.messaging.open} srLabel={row.subject} title={row.subject} width={560}>
                      <div className="flex flex-col gap-3 text-[13px]">
                        <pre className="font-sans whitespace-pre-wrap">{row.bodyMd}</pre>
                        {row.lastError !== null && <p className="text-destructive text-[12px]">{row.lastError}</p>}
                        {row.status === "failed" && <RetryMessage id={row.id} />}
                      </div>
                    </PopoverDisclosure>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </DataTable>
          {log.matching > log.rows.length && <p className="text-muted-foreground mt-3 text-[12px]">{labels.messaging.truncated}</p>}
        </Section>
      </PageBody>
    </>
  );
}

function kindName(key: string): string {
  return labels.messaging.kindNames[key] ?? key;
}

function statusLabel(status: string): string {
  if (status === "sent") return labels.messaging.statusSent;
  if (status === "failed") return labels.messaging.statusFailed;
  return labels.messaging.statusPending;
}

function audienceLabel(audience: MessageAudience): string {
  if (audience === "admins") return labels.messaging.audienceAdmins;
  if (audience === "person") return labels.messaging.audiencePerson;
  const role = audience.slice("role:".length);
  return labels.messaging.audienceRole(isAppRole(role) ? ROLE_LABELS[role] : role);
}

function thresholdText(kind: MessageKind, value: number | undefined): string {
  if (kind.threshold === undefined || value === undefined) return labels.messaging.noThreshold;
  return `${thresholdInput(kind, value)} ${labels.messaging.thresholdUnit[kind.threshold.unit]}`;
}
