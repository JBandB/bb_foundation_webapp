/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De rijen uit het antwoord van `db.execute`.
 *
 * Negen plekken in een eerder project lazen dit als `(result as unknown as { rows?: T[] }).rows ?? []`.
 * Als de driver ooit een andere vorm teruggeeft, levert dat stil nul rijen op, en dan rekent een
 * overzicht verder met niets. Deze helper faalt dan hard, met een fout die zegt wat er mis is.
 */
export function rowsOf<T>(result: unknown): T[] {
  const rows = (result as { rows?: unknown } | null)?.rows;
  if (!Array.isArray(rows)) {
    throw new Error("Het antwoord van de database heeft geen rijen. Is de driver gewijzigd?");
  }
  return rows as T[];
}
