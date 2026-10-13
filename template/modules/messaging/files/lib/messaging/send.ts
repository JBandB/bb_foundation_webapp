/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Eén verzendronde: opeisen wat klaarstaat voor de kanalen die ingericht zijn, Teams per bericht,
 * mail gebundeld per ontvanger, en de stand omzetten. Een kanaal dat niet is ingericht laat zijn
 * berichten staan; de uitkomst zegt wat er ontbreekt, zodat de cron en Beheer dat kunnen tonen.
 */
import type { DbOrTransaction } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";
import { bundleMail } from "./mail-bundle";
import { mailHtml } from "./mail-html";
import { claimPending, countPending, markFailed, markSent } from "./outbox";
import { sendTeams, teamsConfigured, teamsMissing } from "./teams";
import { mailTransport } from "./transport";

export interface SendRun {
  readonly configured: boolean;
  readonly missing: readonly string[];
  /** Wat er nog wacht, ook voor een kanaal dat uit staat. */
  readonly pending: number;
  readonly sent: number;
  readonly failed: number;
}

export async function sendPending(db: DbOrTransaction, organisationId: string, limit = 100): Promise<SendRun> {
  const mailReady = mailTransport.configured();
  const teamsReady = teamsConfigured();
  const missing = [...(mailReady ? [] : mailTransport.missing()), ...teamsMissing()];
  const channels = [...(mailReady ? (["mail"] as const) : []), ...(teamsReady ? (["teams"] as const) : [])];

  const claimed = await claimPending(db, organisationId, channels, limit);
  const pending = missing.length === 0 ? claimed.length : await countPending(db, organisationId);
  if (claimed.length === 0) return { configured: missing.length === 0, missing, pending, sent: 0, failed: 0 };

  let sent = 0;
  let failed = 0;
  const byId = new Map(claimed.map((message) => [message.id, message]));

  for (const message of claimed.filter((one) => one.channel === "teams")) {
    try {
      await sendTeams(message);
      await markSent(db, message.id);
      sent += 1;
    } catch (error) {
      await markFailed(db, message.id, message.attempts, error instanceof Error ? error.message : String(error));
      failed += 1;
    }
  }

  const shell = { buttonLabel: labels.messaging.mailButton, footer: labels.messaging.mailFooter };
  const bundles = bundleMail(
    claimed.filter((one) => one.channel === "mail").map((one) => ({ id: one.id, toEmail: one.toEmail ?? "", subject: one.subject, bodyMd: one.bodyMd })),
    labels.messaging.bundleSubject,
  );
  for (const bundle of bundles) {
    try {
      if (bundle.toEmail === "") throw new Error("Een mail zonder adres kan niet weg.");
      await mailTransport.send({ toEmail: bundle.toEmail, subject: bundle.subject, bodyText: bundle.bodyMd, bodyHtml: mailHtml(bundle.bodyMd, shell) });
      for (const id of bundle.ids) {
        await markSent(db, id);
        sent += 1;
      }
    } catch (error) {
      for (const id of bundle.ids) {
        const message = byId.get(id);
        if (message === undefined) continue;
        await markFailed(db, id, message.attempts, error instanceof Error ? error.message : String(error));
        failed += 1;
      }
    }
  }

  return { configured: missing.length === 0, missing, pending, sent, failed };
}
