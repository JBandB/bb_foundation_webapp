import type { PruneStep } from "./prune";

/**
 * Wat dit project 's nachts mag opruimen, bovenop wat het template doet: verlopen tokens, oude
 * conceptrijen, een cache. Elke stap geeft het aantal verwijderde rijen terug.
 *
 *     { name: "draft_orders", run: (db, now) => pruneDraftOrders(db, now) }
 *
 * Nooit de audit log, nooit zachtverwijderde rijen.
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export const PROJECT_PRUNE_STEPS: readonly PruneStep[] = [];
