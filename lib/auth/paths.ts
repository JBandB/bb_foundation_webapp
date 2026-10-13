/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */

/**
 * De paden van de inlog, in een bestand zonder imports. `auth.ts` en `session.ts` hebben ze allebei
 * nodig en importeren elkaar al; een constante die in een van de twee staat, geeft dan een kring
 * waarin de bundelaar hem leest voordat hij bestaat.
 */
export const SIGN_IN_PATH = "/sign-in";
