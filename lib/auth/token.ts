/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Onze eigen velden op de JWT, en hoe je ze er veilig weer uit haalt.
 *
 * De JWT wordt met opzet niet getypeerd via een module-augmentatie. Dat type woont in
 * `@auth/core/jwt`, een transitieve dependency, en een augmentatie op `next-auth/jwt` grijpt daar
 * niet op aan. In plaats van een pad in iemand anders zijn node_modules vast te leggen, valideren we
 * bij het uitlezen.
 *
 * Dat is ook eerlijker: een token is invoer, ook als je hem zelf hebt ondertekend. Een oude cookie
 * uit een vorige versie van de applicatie kan velden missen of anders bedoeld hebben.
 */

import type { Actor } from "./actor";
import { parseRoles } from "./roles";

/** De namen van onze eigen velden, op één plek zodat ze niet gaan verlopen. */
export const TOKEN_FIELDS = {
  userId: "userId",
  organisationId: "organisationId",
  initials: "initials",
  roles: "roles",
  /** Het inlogmoment in epoch-seconden; de grens van de sessie telt daarvanaf (`session-age.ts`). */
  loginAt: "loginAt",
} as const;

/** Leest een veld als string, met een expliciete fallback. */
export function tokenText(value: unknown, fallback: string): string {
  return typeof value === "string" && value !== "" ? value : fallback;
}

/**
 * Bouwt de actor die de applicatie gebruikt uit de ruwe token-velden.
 *
 * Ontbreekt de userId, dan blijft die leeg en beschouwt `requireSession()` de sessie als ongeldig.
 * Dat is beter dan hier gooien: een kapotte cookie moet leiden tot opnieuw inloggen, niet tot een
 * foutpagina.
 */
export function actorFromToken(token: Record<string, unknown>): Actor {
  return {
    id: tokenText(token[TOKEN_FIELDS.userId], ""),
    organisationId: tokenText(token[TOKEN_FIELDS.organisationId], ""),
    name: tokenText(token["name"], ""),
    email: tokenText(token["email"], ""),
    initials: tokenText(token[TOKEN_FIELDS.initials], "?"),
    /* Ook hier langs de validatie, niet blind overnemen. */
    roles: parseRoles(token[TOKEN_FIELDS.roles]),
  };
}
