/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Schrijven naar de audit log. Zie CLAUDE.md regel 5.
 *
 * **Altijd in dezelfde transactie als de mutatie waar het over gaat.** Dat is de hele reden dat deze
 * functie een `DbOrTransaction` aanneemt in plaats van zelf `getDb()` te doen: een logregel die apart
 * wordt weggeschreven kan ontbreken terwijl de mutatie er wel is, en dan liegt de log.
 *
 * Terugweg is er niet. De trigger uit de tweede migratie weigert elke `update` en elke `delete` op
 * deze tabel, ook vanaf de verbinding van de applicatie.
 */

import { PROJECT } from "@/lib/project/config.generated";
import type { ProjectAuditAction } from "./audit-actions";
import type { DbOrTransaction } from "./client";
import { auditLog } from "./schema";

/** De handelingen van het template, plus die van het project. */
export type AuditAction = "insert" | "update" | "delete" | "restore" | ProjectAuditAction;

export interface AuditEntry {
  readonly entityTable: string;
  readonly entityId: string;
  readonly action: AuditAction;
  /** De oude waarde bij een update of delete. Leeg bij een insert. */
  readonly before?: unknown;
  /** De nieuwe waarde bij een insert of update. Leeg bij een delete. */
  readonly after?: unknown;
}

/**
 * Wie er handelde.
 *
 * Een ingelogde gebruiker (de `Actor` uit lib/auth voldoet aan deze vorm) of `systemActor()` bij een
 * cron. Het e-mailadres is verplicht in de tabel en de gebruiker niet, precies zodat een cron ook te
 * loggen is zonder een nepgebruiker te verzinnen.
 */
export interface AuditActor {
  /** Leeg betekent geen mens, zie systemActor. */
  readonly id: string;
  readonly email: string;
  readonly organisationId: string;
  /** Waarvandaan, als de aanroep uit een verzoek komt. Een cron heeft geen herkomst. */
  readonly ip?: string | undefined;
  readonly userAgent?: string | undefined;
}

/** Alleen iets dat op een adres lijkt mag de inet-kolom in; de rest wordt leeg. */
function asInet(value: string | undefined): string | null {
  if (value === undefined) return null;
  return /^[0-9a-fA-F.:]+$/.test(value) && /[.:]/.test(value) ? value : null;
}

/** Voor crons en taken, die geen ingelogde gebruiker hebben. Het adres komt uit project.config.json. */
export function systemActor(organisationId: string): AuditActor {
  return { id: "", email: PROJECT.systemEmail, organisationId };
}

/**
 * Zet één regel in de log.
 *
 * `before` en `after` gaan er als `jsonb` in. Zet er niet het hele rij-object in als daar iets in zit
 * dat je later niet in een export wil zien: de log is voor beheerders leesbaar, en voor altijd.
 */
export async function appendAuditLog(db: DbOrTransaction, actor: AuditActor, entry: AuditEntry): Promise<void> {
  await db.insert(auditLog).values({
    organisationId: actor.organisationId,
    actorUserId: actor.id === "" ? null : actor.id,
    actorEmail: actor.email,
    entityTable: entry.entityTable,
    entityId: entry.entityId,
    action: entry.action,
    before: entry.before ?? null,
    after: entry.after ?? null,
    ip: asInet(actor.ip),
    userAgent: actor.userAgent ?? null,
  });
}
