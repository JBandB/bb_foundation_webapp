/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Eén functie, één plek. Elke server action roept `can()` of `assertCan()` expliciet aan.
 *
 * Deze functie zegt of een rol een actie mag uitvoeren. Hij zegt niets over welke rijen of kolommen
 * in een antwoord mogen staan: dat gebeurt in de query. `can()` is dus geen vervanging voor die
 * filtering, en `display:none` is geen autorisatie. Zie CLAUDE.md regel 11.
 *
 * De lijst rechten staat in `actions.ts` en de matrix in `matrix.ts`; allebei van het project.
 */

import type { Action } from "./actions";
import type { RoleHolder } from "./actor";
import { MATRIX } from "./matrix";
import type { AppRole } from "./roles.generated";

/** Wat een rol mag, als lijst. Voor het scherm Toegang en nergens anders: de enige plek die rechten beoordeelt is `can()`. */
export function allowedActions(role: AppRole): readonly Action[] {
  return MATRIX[role];
}

/** Mag deze actor deze actie uitvoeren. Geen rol betekent niets mogen. */
export function can(actor: RoleHolder, action: Action): boolean {
  return actor.roles.some((role) => MATRIX[role].includes(action));
}

/**
 * Zelfde vraag, maar gooit in plaats van false teruggeven. Voor gebruik aan het begin van een server
 * action, zodat de rest van de functie mag aannemen dat het mag.
 */
export function assertCan(actor: RoleHolder, action: Action): void {
  if (!can(actor, action)) throw new AuthorisationError(action);
}

/** Eén van meerdere rechten is genoeg. De fout draagt de eerste actie. */
export function assertCanAny(actor: RoleHolder, actions: readonly [Action, ...Action[]]): void {
  if (!actions.some((action) => can(actor, action))) throw new AuthorisationError(actions[0]);
}

/**
 * De actie zit op de error en niet in de melding aan de gebruiker. Die krijgt één neutrale regel,
 * want welke acties er bestaan is niets wat iemand zonder rechten hoeft te weten.
 */
export class AuthorisationError extends Error {
  readonly action: Action;

  constructor(action: Action) {
    super("Je hebt geen rechten voor deze actie.");
    this.name = "AuthorisationError";
    this.action = action;
  }
}
