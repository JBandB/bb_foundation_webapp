/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het bericht met de gegevens van één verzoek. Alleen de velden uit de catalogus gaan mee, in hun
 * volgorde, als regels "Veld: waarde" tussen <gegevens> en </gegevens>. Wat de aanroeper verder
 * meegeeft, valt weg: zo kan een scherm nooit per ongeluk meer naar buiten sturen dan het
 * projectplan toestaat.
 *
 * Tekst van een gebruiker is gegevens, geen opdracht. Daarom kan een waarde de tags niet sluiten of
 * openen, en kan een regel in een waarde niet op een nieuw veld lijken: elke volgende regel van een
 * waarde springt in.
 */

export const DATA_TAG = "gegevens";

const TAG = new RegExp(`<\\s*/?\\s*${DATA_TAG}\\s*>`, "gi");

/** Eén waarde, veilig tussen de tags. */
export function cleanValue(value: string): string {
  return value
    .replace(TAG, "")
    .replace(/\r\n?/g, "\n")
    .trim()
    .split("\n")
    .map((line, index) => (index === 0 ? line : `  ${line}`))
    .join("\n");
}

export function buildUserMessage(fields: readonly string[], values: Readonly<Record<string, string | null | undefined>>): string {
  const lines = fields.map((label) => `${label}: ${cleanValue(values[label] ?? "")}`.trimEnd());
  return [`<${DATA_TAG}>`, ...lines, `</${DATA_TAG}>`].join("\n");
}
