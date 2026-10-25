/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Mag een login een bestaande `users`-rij op e-mailadres overnemen?
 *
 * `syncUserFromToken` zoekt eerst op `external_id`, en anders op e-mailadres. Die tweede stap bestaat
 * voor het dev-account uit de seed: zijn rij draagt `dev:<adres>`, want een echte identiteit was bij
 * het seeden niet bekend. Zonder deze regel nam de terugval elke rij met dat adres over, ongeacht wat
 * er in `external_id` stond: een tweede identiteit met dezelfde e-mailclaim kreeg zo de rij, de rollen
 * en de historie van een ander. De e-mailclaim is geen betrouwbare sleutel; het vaste id van de
 * inlogmodule wel.
 *
 * **De regel.** Op e-mail overnemen mag alleen een rij die nog aan geen echte identiteit hangt, dus
 * waarvan `external_id` met `dev:` begint. **Of als de login zelf de dev-login is**, herkenbaar aan
 * hetzelfde voorvoegsel: die bestaat alleen lokaal (`APP_ENV=local`), en zo blijft lokaal van rol
 * wisselen werken op een branch waar de rijen al een echte identiteit hebben.
 *
 * Puur, zodat de grens zonder database te testen is.
 */

/** Het voorvoegsel van een `external_id` die nog geen echte identiteit is. Zie `scripts/db-seed.ts`. */
export const PLACEHOLDER_PREFIX = "dev:";

export function mayClaimByEmail(rowExternalId: string, loginExternalId: string): boolean {
  return rowExternalId.startsWith(PLACEHOLDER_PREFIX) || loginExternalId.startsWith(PLACEHOLDER_PREFIX);
}
