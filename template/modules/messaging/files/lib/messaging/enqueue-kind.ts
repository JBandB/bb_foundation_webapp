/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De ene manier om een bericht van een soort te versturen: de instellingen van de beheerder
 * bepalen of het gebeurt en naar wie, de catalogus bepaalt het kanaal, en de outbox zorgt dat het
 * één keer gebeurt. Code die iets wil melden, roept dit aan en verder niets.
 */
import type { DbOrTransaction } from "@/lib/db/client";
import { kindFor } from "./kinds";
import { enqueueMessages, type OutboxMessage } from "./outbox";
import { audienceEmails } from "./recipients";
import { loadSettings, settingFor, type MessageSettings } from "./settings";

export interface KindMessage {
  /** Waar het over gaat, voor de idempotentiesleutel: een id, en een datum als het morgen weer mag. */
  readonly about: string;
  readonly subject: string;
  readonly bodyMd: string;
  /** Het adres bij doelgroep `person`; bij een andere doelgroep genegeerd. */
  readonly person?: string | undefined;
}

export interface EnqueueKindResult {
  readonly enabled: boolean;
  readonly recipients: number;
  /** Nieuw in de rij; wat er al stond met dezelfde sleutel telt niet mee. */
  readonly queued: number;
}

export async function enqueueKind(db: DbOrTransaction, organisationId: string, kindKey: string, message: KindMessage, settings?: MessageSettings): Promise<EnqueueKindResult> {
  const kind = kindFor(kindKey);
  const setting = settingFor(settings ?? (await loadSettings(db, organisationId)), kindKey);
  if (!setting.enabled) return { enabled: false, recipients: 0, queued: 0 };

  const messages: OutboxMessage[] =
    kind.channel === "teams"
      ? [{ idempotencyKey: `${kindKey}:${message.about}:teams`, kind: kindKey, channel: "teams", subject: message.subject, bodyMd: message.bodyMd }]
      : (await audienceEmails(db, organisationId, setting.audience, message.person)).map((toEmail) => ({
          idempotencyKey: `${kindKey}:${message.about}:${toEmail.toLowerCase()}`,
          kind: kindKey,
          channel: "mail" as const,
          toEmail,
          subject: message.subject,
          bodyMd: message.bodyMd,
        }));

  const queued = await enqueueMessages(db, organisationId, messages);
  return { enabled: true, recipients: messages.length, queued };
}
