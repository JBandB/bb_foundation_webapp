/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */

/**
 * Wat een domeinfunctie zegt over het verwijderen van iets: kan het, en wat gaat er mee. Dezelfde
 * functie voedt het scherm (`DeletePanel`) en de server action, zodat het scherm nooit iets aanbiedt
 * dat daarna wordt geweigerd.
 */
export interface DeleteState {
  /** De reden dat het niet kan, in gewone taal. Leeg als het kan. */
  readonly blocker?: string;
  /** Wat er mee verdwijnt, als zinnen voor op het scherm. */
  readonly alsoRemoved: readonly string[];
}

export const DELETABLE: DeleteState = { alsoRemoved: [] };

export function blocked(reason: string): DeleteState {
  return { blocker: reason, alsoRemoved: [] };
}
