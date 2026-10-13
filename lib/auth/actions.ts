import { CORE_ACTIONS } from "./actions.core";

/**
 * De rechten van dit project, als `<onderwerp>:<werkwoord>` en eventueel `:<bereik>`:
 * `order:read`, `order:write`, `report:read:all`. Elk recht hier krijgt een label in
 * `lib/i18n/domain/actions.ts` en een plek in `matrix.ts`; de typecheck dwingt allebei af.
 *
 *     export const PROJECT_ACTIONS = ["order:read", "order:write"] as const;
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export const PROJECT_ACTIONS = [] as const;

export const ACTIONS = [...CORE_ACTIONS, ...PROJECT_ACTIONS] as const;

export type Action = (typeof ACTIONS)[number];
