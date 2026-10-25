/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De absolute looptijd van een sessie.
 *
 * Auth.js tekent het token bij elke aanvraag van `/api/auth/session` opnieuw voor de volle `maxAge`
 * (`@auth/core` 0.41). Zonder eigen grens houdt één `fetch` per acht uur een sessie dus eindeloos
 * levend, met de rollen van het moment van inloggen. Daarom staat het inlogmoment op het token
 * (`loginAt`, in epoch-seconden) en loopt een sessie hoogstens acht uur na dat moment af, hoe vaak hij
 * ook ververst wordt.
 *
 * Puur, zodat de grens zonder Auth.js te testen is. De jwt-callback in `callbacks.ts` past hem toe.
 */

/** Acht uur: een werkdag. Een rolwijziging bij de inlogmodule landt daarmee binnen een werkdag. */
export const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

/** Nu, in hele epoch-seconden, zoals `iat` en `exp` op een JWT. */
export function epochSeconds(now: Date = new Date()): number {
  return Math.floor(now.getTime() / 1000);
}

/**
 * Is deze sessie over zijn absolute looptijd heen?
 *
 * **Een ontbrekend of onleesbaar `loginAt` telt als verlopen.** Dat zijn cookies van vóór deze regel:
 * die kennen hun inlogmoment niet, en raden is erger dan iedereen één keer opnieuw laten inloggen.
 *
 * Precies op de grens is de sessie nog geldig; een seconde erna niet.
 */
export function sessionExpired(loginAt: unknown, now: number, maxAge: number): boolean {
  if (typeof loginAt !== "number" || !Number.isFinite(loginAt)) return true;
  return now - loginAt > maxAge;
}
