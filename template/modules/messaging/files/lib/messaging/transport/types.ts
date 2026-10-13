/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */

export interface MailMessage {
  readonly toEmail: string;
  readonly subject: string;
  /** De platte tekst, voor clients zonder HTML en voor het logboek. */
  readonly bodyText: string;
  readonly bodyHtml: string;
}

/**
 * Eén manier om een mail de deur uit te krijgen. Welke geldt, staat in project.config.json
 * (`messaging.transport`); lib/messaging/transport/index.ts kiest. De rest van de module kent
 * alleen dit contract.
 */
export interface MailTransport {
  readonly name: string;
  /** Staan alle variabelen er? Zonder blijft de mail in de outbox met de melding wat er ontbreekt. */
  configured(): boolean;
  missing(): string[];
  send(message: MailMessage): Promise<void>;
  /** Een lichte proef zonder mail: een token of een handdruk. Geeft één regel terug voor Beheer, Systeem. */
  verify(): Promise<string>;
}
