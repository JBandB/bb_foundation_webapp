/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het contract van een handler: de code die één soort taak echt uitvoert. Het project schrijft ze in
 * lib/jobs/handlers.ts (een seed, dus van het project), gesleuteld op `<system>:<operation>`.
 *
 * Een handler is idempotent: dezelfde taak twee keer uitvoeren mag nooit twee keer effect hebben.
 * De sleutel in de database voorkomt dubbele taken, maar een ronde kan omvallen nadat de aanroep
 * naar buiten slaagde en voordat `done` is gezet. Dan komt de taak terug en de handler moet dat
 * aankunnen: eerst kijken of het al bestaat, dan pas aanmaken.
 */
import type { DbOrTransaction } from "@/lib/db/client";

export interface JobContext {
  readonly id: string;
  readonly organisationId: string;
  readonly system: string;
  readonly operation: string;
  readonly entityType: string;
  readonly entityId: string;
  /** Hoe vaak dit al mislukte. Nul bij de eerste keer. */
  readonly attempts: number;
  readonly request: unknown;
  readonly db: DbOrTransaction;
}

export type HandlerResult =
  /** Klaar; het antwoord van buiten wordt bewaard op de rij. */
  | { readonly kind: "done"; readonly response?: unknown }
  /** Nog niet aan de beurt, met de reden; de volgende ronde probeert het opnieuw zonder dat dit als poging telt. */
  | { readonly kind: "waiting"; readonly reason: string };

/** Gooit een handler, dan telt dat als mislukte poging en komt de taak terug tot MAX_ATTEMPTS. */
export type JobHandler = (job: JobContext) => Promise<HandlerResult>;

export type JobHandlers = Readonly<Record<string, JobHandler>>;

export function handlerKey(system: string, operation: string): string {
  return `${system}:${operation}`;
}

export function done(response?: unknown): HandlerResult {
  return { kind: "done", response };
}

export function waiting(reason: string): HandlerResult {
  return { kind: "waiting", reason };
}
