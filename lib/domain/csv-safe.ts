/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * CSV die Excel op Windows goed opent, en die bij een ander niets uitvoert (les L-HTTP-04).
 *
 * - Een BOM vooraan, anders leest Excel UTF-8 als Windows-1252 en wordt een trema een vraagteken.
 * - Puntkomma als scheiding, want een Nederlandse Excel verwacht die en een komma hakt bedragen in
 *   tweeën. CRLF als regeleinde.
 * - Elk veld tussen aanhalingstekens, interne aanhalingstekens verdubbeld.
 * - Een cel die met =, +, - of @ begint voert Excel uit als formule (CSV-injectie). Zo'n cel krijgt
 *   een apostrof ervoor, behalve als het een gewoon getal is. Wie een eigen export weer inleest,
 *   haalt die apostrof met `stripNeutralisation` weer weg.
 */

export const CSV_BOM = "﻿";
export const CSV_SEPARATOR = ";";
export const CSV_LINE_END = "\r\n";

export type CsvValue = string | number | bigint | boolean | null | undefined;
export type CsvSeparator = ";" | "," | "\t";

const PLAIN_NUMBER = /^-?\d+(?:[.,]\d+)?$/;
const FORMULA_START = /^[=+\-@\t\r]/;

/** Zet een apostrof voor een tekst die Excel als formule zou lezen. Een gewoon (negatief) getal blijft. */
export function neutraliseFormula(value: string): string {
  if (!FORMULA_START.test(value) || PLAIN_NUMBER.test(value)) return value;
  return `'${value}`;
}

/** De omkering, voor het opnieuw inlezen van een eigen export. Een gewone apostrof blijft staan. */
export function stripNeutralisation(value: string): string {
  return value.length > 1 && value.startsWith("'") && FORMULA_START.test(value.slice(1)) ? value.slice(1) : value;
}

/** Eén veld: altijd tussen aanhalingstekens, geneutraliseerd als het tekst is. */
export function csvField(value: CsvValue): string {
  if (value === null || value === undefined) return '""';
  const text = typeof value === "string" ? neutraliseFormula(value) : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function csvLine(fields: readonly CsvValue[]): string {
  return fields.map(csvField).join(CSV_SEPARATOR);
}

/** Het hele document, klaar om als `text/csv; charset=utf-8` terug te geven. */
export function csvDocument(rows: readonly (readonly CsvValue[])[]): string {
  return `${CSV_BOM}${rows.map(csvLine).join(CSV_LINE_END)}${CSV_LINE_END}`;
}

/** Raadt het scheidingsteken uit de eerste regel van een bestand van buiten; tekens tussen aanhalingstekens tellen niet. */
export function guessSeparator(firstLine: string): CsvSeparator {
  const counts: Record<CsvSeparator, number> = { ";": 0, ",": 0, "\t": 0 };
  let inQuotes = false;
  for (const character of firstLine) {
    if (character === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (character === ";" || character === "," || character === "\t")) counts[character] += 1;
  }
  const best = (Object.keys(counts) as CsvSeparator[]).sort((a, b) => counts[b] - counts[a])[0];
  return best !== undefined && counts[best] > 0 ? best : CSV_SEPARATOR;
}
