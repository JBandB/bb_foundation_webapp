/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Ids van buiten: is het er een, en is het hetzelfde id.
 *
 * **Alleen de vorm.** Elk id is een `uuid`-kolom, en Postgres weigert een waarde die er niet op lijkt
 * met een castfout. Komt die waarde uit een URL of een formulier, dan is dat gewone invoer, en hoort
 * het antwoord een 404 of een lege lijst te zijn en geen stack trace. Of het id bestaat en van jouw
 * organisatie is, blijft een vraag voor de query.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(value: string): boolean {
  return UUID.test(value);
}

/**
 * Zijn dit hetzelfde id? Zonder op hoofdletters te letten, zoals Postgres een `uuid` vergelijkt.
 *
 * Een id uit een formulier gaat ongewijzigd naar de query, en daar is `B57CBC18-...` dezelfde rij als
 * `b57cbc18-...`. Een vergelijking met `===` zegt dan "iemand anders". In een eerder project kon zo
 * iemand een "nooit jezelf"-slot omzeilen door het eigen id in hoofdletters mee te sturen: het slot
 * keek naar de tekst, de database naar de rij. Elke vergelijking met `actor.id` loopt hierlangs; de
 * huisregel `same-id` bewaakt dat.
 */
export function sameId(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}
