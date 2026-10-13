/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */

/**
 * De staat die een server action teruggeeft aan een formulier met `useActionState`: per veld een
 * fout, en een bevestiging als het gelukt is. Geen `any` en geen losse strings per formulier, zodat
 * elk formulier dezelfde twee dingen kan tonen: `FormError` en `FormDone` uit field.tsx.
 */
export interface FormState {
  readonly errors: Readonly<Record<string, string>>;
  /** De bevestiging als het gelukt is. */
  readonly done?: string;
}

export const EMPTY_FORM_STATE: FormState = { errors: {} };

/** De eerste fout, voor een formulier dat één melding toont. */
export function firstError(state: FormState): string | undefined {
  return Object.values(state.errors)[0];
}
