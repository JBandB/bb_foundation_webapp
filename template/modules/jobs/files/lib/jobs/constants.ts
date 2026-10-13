/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Eén set getallen voor de hele wachtrij. In een eerder project stonden ze in vier kopieën, met
 * drie verschillende waarden voor hetzelfde idee.
 */

/** Na zoveel mislukte pogingen blijft een taak op `failed` staan tot iemand op "opnieuw" drukt. */
export const MAX_ATTEMPTS = 5;

/** Hoe lang een ronde een taak vasthoudt. Ruim boven de zestig seconden van een cron. */
export const CLAIM_MINUTES = 5;

/** Hoogstens zoveel taken per ronde, zodat een ronde binnen de tijd van een cron blijft. */
export const ROUND_LIMIT = 50;

/**
 * Wanneer de wachtrij vastgelopen heet: er wacht iets dat ouder is dan dit, en in diezelfde tijd is
 * er niets gebeurd. Een taak wordt normaal direct na de handeling verwerkt (lib/jobs/kick.ts), dus
 * een uur stilte met werk in de rij is een storing en geen rustig moment.
 */
export const STUCK_AFTER_MINUTES = 60;

/** Afgehandeld werk blijft zo lang leesbaar en gaat dan weg; de audit log blijft. */
export const KEEP_DONE_DAYS = 30;
