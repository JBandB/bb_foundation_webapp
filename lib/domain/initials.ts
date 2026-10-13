/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */

/**
 * Initialen voor de avatar in de rail.
 *
 * Afgeleid en niet ingevoerd, want een veld dat een mens moet invullen om een rondje met twee
 * letters te vullen is een veld dat leeg blijft. Een pure functie: geen database, geen sessie.
 *
 * "Anna de Vries" wordt AV (tussenvoegsels worden overgeslagen), "Mohammed" wordt MO (nooit één
 * letter, want dan staat het rondje asymmetrisch), en leeg wordt een vraagteken. Alleen woorden die
 * met een letter beginnen tellen mee: een naam uit een directory kan een pipe of een ampersand als
 * los woord bevatten, en "&" als initiaal is geen initiaal.
 */
export function initialsOf(displayName: string): string {
  const parts = displayName
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => /^\p{L}/u.test(part));

  if (parts.length === 0) return "?";
  if (parts.length === 1) return (parts[0] ?? "").slice(0, 2).toUpperCase();

  const first = parts[0]?.[0] ?? "";
  const last = parts[parts.length - 1]?.[0] ?? "";
  return `${first}${last}`.toUpperCase();
}
