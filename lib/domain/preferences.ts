/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wat iemand voor zichzelf heeft ingesteld. Zie lib/db/schema/user-preferences.ts.
 *
 * **Geen rol-assert.** Dit gaat over de eigen voorkeuren van de ingelogde gebruiker en de functies
 * nemen daarom een `userId` dat de aanroeper uit de sessie haalt. Er is geen pad om de voorkeur van
 * iemand anders te lezen of te schrijven, en dat is met opzet: een filter dat er niet is, kan ook niet
 * per ongeluk opengezet worden.
 */

import { and, eq, sql } from "drizzle-orm";
import type { DbOrTransaction } from "@/lib/db/client";
import { userPreferences } from "@/lib/db/schema";

/** Licht of donker. Licht is de standaard: daar opent iedereen die niets kiest. */
export const THEMES = ["light", "dark"] as const;
export type Theme = (typeof THEMES)[number];
export const DEFAULT_THEME: Theme = "light";

/** Wat er in een formulierwaarde mag staan, opgeschoond. */
export function toTheme(raw: string | undefined): Theme | undefined {
  return THEMES.find((theme) => theme === raw);
}

export async function loadTheme(db: DbOrTransaction, input: { organisationId: string; userId: string }): Promise<Theme> {
  const row = (
    await db
      .select({ theme: userPreferences.theme })
      .from(userPreferences)
      .where(and(eq(userPreferences.userId, input.userId), eq(userPreferences.organisationId, input.organisationId)))
      .limit(1)
  )[0];
  return toTheme(row?.theme) ?? DEFAULT_THEME;
}

/** Eén rij per gebruiker, aangemaakt bij de eerste wijziging. */
export async function saveTheme(db: DbOrTransaction, input: { organisationId: string; userId: string; theme: Theme }): Promise<void> {
  await db
    .insert(userPreferences)
    .values({ userId: input.userId, organisationId: input.organisationId, theme: input.theme })
    .onConflictDoUpdate({ target: userPreferences.userId, set: { theme: input.theme, updatedAt: sql`now()` } });
}
