/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De weergavenaam opschonen zoals een directory hem aanlevert.
 *
 * In menig tenant staat achter de naam een organisatiesuffix: het token levert "Anna de Vries |
 * Organisatie" en niet "Anna de Vries". Onbewerkt doorlaten geeft twee problemen. In de rail staat
 * de organisatienaam er twee keer, en de initialen gaan mis: de eerste en de laatste naam zijn dan
 * "Anna" en "Organisatie".
 */

/** Scheidingstekens waarachter een organisatiesuffix begint. Entra gebruikt in de praktijk de pipe, andere tenants een streepje of een haakje. */
const SUFFIX_SEPARATORS = ["|", "(", " - "];

export function normaliseDisplayName(raw: string): string {
  let name = raw;

  for (const separator of SUFFIX_SEPARATORS) {
    const at = name.indexOf(separator);
    if (at > 0) name = name.slice(0, at);
  }

  /* Dubbele spaties samenvouwen, want die ontstaan bij het afknippen. */
  const cleaned = name.replace(/\s+/g, " ").trim();

  /* Blijft er niets over, dan was de hele naam een suffix en is de ruwe waarde nog altijd beter dan een leeg veld. */
  return cleaned === "" ? raw.trim() : cleaned;
}
