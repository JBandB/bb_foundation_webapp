/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Migratiebestanden inlezen en opdelen.
 *
 * drizzle-kit scheidt statements met een `--> statement-breakpoint`-marker, en die splitsing moeten
 * wij zelf doen omdat `pnpm db:down` de down-bestanden uitvoert en drizzle-kit daar niets van weet.
 */

export const STATEMENT_BREAKPOINT = "--> statement-breakpoint";

/**
 * Splitst een migratiebestand in losse statements.
 *
 * Stukken die alleen uit commentaar bestaan vallen weg, want een lege query naar de database sturen
 * levert een fout op die niets uitlegt.
 */
export function splitStatements(sql: string): string[] {
  return sql
    .split(STATEMENT_BREAKPOINT)
    .map((part) => part.trim())
    .filter((part) => part !== "" && !isOnlyComments(part));
}

function isOnlyComments(part: string): boolean {
  return part.split("\n").every((line) => line.trim() === "" || line.trim().startsWith("--"));
}
