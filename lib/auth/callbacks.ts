/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De twee callbacks van Auth.js, uit auth.ts gehaald zodat die een leesbare compositieroot blijft.
 *
 * `jwt` loopt bij het inloggen en daarna bij elk verzoek. `session` loopt bij elke keer dat de
 * applicatie de sessie opvraagt. Alleen bij het inloggen is er een `user` en een `account`, en dat is
 * het enige moment waarop de database wordt aangeraakt.
 */

import type { Account, Session, User } from "next-auth";
import { loginProviderById } from "./providers";
import { parseRoles } from "./roles";
import { epochSeconds, SESSION_MAX_AGE_SECONDS, sessionExpired } from "./session-age";
import { actorFromToken, TOKEN_FIELDS } from "./token";
import { errorForLog } from "@/lib/monitoring/error-text";

type Token = Record<string, unknown>;

/**
 * Elke fout in de jwt-callback komt bij de gebruiker aan als `Configuration`, met de tekst "There is
 * a problem with the server configuration". Dat is voor elke oorzaak dezelfde melding en dus
 * onbruikbaar om iets mee te vinden.
 *
 * Deze wrapper zet de echte oorzaak in de serverlog voordat de fout verder gaat, met de meest
 * waarschijnlijke verklaring erbij. De eerste keer dat dit in een eerder project gebeurde was een
 * database zonder migraties, en daar is een halve middag aan opgegaan.
 */
async function withReadableFailure<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn();
  } catch (error) {
    const message = errorForLog(error);
    console.error(
      [
        "Login mislukt bij het synchroniseren van de gebruiker.",
        `Oorzaak: ${message}`,
        "Controleer of deze omgeving naar de juiste databasebranch wijst en of daar migraties zijn",
        "uitgevoerd (pnpm db:status), en of de organisatie bestaat (pnpm db:bootstrap).",
      ].join(" "),
    );
    throw error;
  }
}

/**
 * Buiten het inloggen bewaakt deze callback alleen de absolute grens: Auth.js tekent het token bij
 * elke sessieaanvraag opnieuw, dus `maxAge` alleen begrenst niets. `null` teruggeven laat Auth.js de
 * cookie opruimen, en daarna stuurt `requireSession` naar de inlog. Een cookie zonder `loginAt` (van
 * vóór deze regel) telt als verlopen: iedereen logt na de uitrol één keer opnieuw in.
 */
export async function jwtCallback({ token, user, account }: { token: Token; user?: User; account?: Account | null }): Promise<Token | null> {
  const isSignIn = user !== undefined && account !== undefined && account !== null;
  if (!isSignIn) {
    return sessionExpired(token[TOKEN_FIELDS.loginAt], epochSeconds(), SESSION_MAX_AGE_SECONDS) ? null : token;
  }

  const provider = loginProviderById(account.provider);
  if (provider === undefined) {
    throw new Error(`Onbekende inlogmethode "${account.provider}". Staat de module in project.config.json en is pnpm template:generate gedraaid?`);
  }

  const synced = await withReadableFailure(() => provider.resolve(user, account));
  const roles = provider.rolesFrom === "token" ? parseRoles(user.roles) : parseRoles(synced.roles);

  token[TOKEN_FIELDS.userId] = synced.id;
  token[TOKEN_FIELDS.organisationId] = synced.organisationId;
  token[TOKEN_FIELDS.initials] = synced.initials;
  token[TOKEN_FIELDS.roles] = roles;
  token[TOKEN_FIELDS.loginAt] = epochSeconds();
  token["name"] = synced.displayName;
  token["email"] = synced.email;
  return token;
}

export function sessionCallback({ session, token }: { session: Session; token: Token }): Session {
  session.user = actorFromToken(token);
  return session;
}

/**
 * Een mailadres voor in een logregel: eerste letter en domein. Genoeg om te zien om wie het gaat,
 * zonder het volledige adres in de logs van Vercel.
 */
export function maskEmail(email: string): string {
  const at = email.indexOf("@");
  if (at <= 0) return "onbekend";
  return `${email[0]}***${email.slice(at)}`;
}
