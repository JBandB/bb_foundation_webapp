import type { PROJECT_ACTIONS } from "@/lib/auth/actions";

/**
 * Het label per recht van dit project, voor het scherm Toegang (wie mag wat). Eén regel per recht uit
 * `lib/auth/actions.ts`; vergeet je er een, dan compileert `lib/i18n/labels.ts` niet.
 *
 *     export const projectActionLabels = {
 *       "order:read": "Bestellingen zien",
 *       "order:write": "Bestellingen aanmaken en wijzigen",
 *     } satisfies Record<(typeof PROJECT_ACTIONS)[number], string>;
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export const projectActionLabels = {} satisfies Record<(typeof PROJECT_ACTIONS)[number], string>;
