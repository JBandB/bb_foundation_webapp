import type { MessageKind } from "./kinds";

/**
 * De berichtsoorten van dit project, naast die van de kern in lib/messaging/kinds.ts. Per soort: de
 * sleutel (snake_case, komt in de outbox en in de instellingen), het kanaal, de doelgroepen die bij
 * deze soort kunnen en de standaard, en een drempel als de soort er een heeft.
 *
 * Dit bestand is van het project en blijft staan bij een update van het template. Een voorbeeld:
 *
 *   export const PROJECT_KINDS: readonly MessageKind[] = [
 *     {
 *       key: "shift_unfilled",
 *       channel: "mail",
 *       audiences: ["role:coordinator", "admins"],
 *       defaultAudience: "role:coordinator",
 *       threshold: { unit: "days", min: 1, max: 30, fallback: 3 },
 *     },
 *   ];
 *
 * Versturen gaat met `enqueueKind` in lib/messaging/enqueue-kind.ts; de instellingen van de
 * beheerder bepalen of en naar wie.
 */
export const PROJECT_KINDS: readonly MessageKind[] = [];
