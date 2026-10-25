/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Dev-login: lokaal inloggen als een van de dev-accounts uit project.config.json, met de rollen die
 * je wilt bekijken.
 *
 * Wat hier lokaal wordt nagemaakt is identiteit, niet opslag. De database is echt, de inlogmodule
 * niet. Zo wissel je in twee seconden van rol zonder een SSO-flow te doorlopen, en dat is precies de
 * wrijving die het anders te duur maakt om te controleren wat een rol wel en niet krijgt.
 *
 * Twee harde guards:
 *
 * 1. De provider wordt niet geregistreerd als AUTH_DEV_LOGIN ontbreekt.
 * 2. Hij werkt alleen als de omgeving zelf zegt dat hij lokaal is: `APP_ENV=local`. Staat
 *    AUTH_DEV_LOGIN aan in elke andere omgeving, ook een onbekende, dan gooit deze module bij het
 *    opstarten. Een deploy die dit pad probeert te gebruiken start dus niet op, in plaats van stil een
 *    achterdeur te openen. Een slot op `VERCEL_ENV` faalde op elke andere host open; zie
 *    `lib/domain/deploy-environment.ts`.
 *
 * Gevolg dat je moet weten: op een preview-deployment werkt de dev-login niet. Een pull request
 * bekijken vraagt een echte login. En `vercel env pull` overschrijft `.env.local`: zet
 * `APP_ENV=local` er daarna weer in.
 */

import Credentials from "next-auth/providers/credentials";
import { deployEnvironment } from "@/lib/domain/deploy-environment";
import type { LoginProvider } from "../login-provider";
import { APP_ROLES, parseRoles, type AppRole } from "../roles";
import { findUserByEmail, syncUserFromToken } from "../user-sync";

/** De id waarop de jwt-callback dit pad herkent. */
export const DEV_LOGIN_PROVIDER_ID = "dev-login";

const isEnabled = process.env.AUTH_DEV_LOGIN === "1";
const environment = deployEnvironment();

if (isEnabled && environment !== "local") {
  throw new Error(
    environment === "unknown"
      ? "AUTH_DEV_LOGIN staat aan, maar APP_ENV is niet local. Lokaal: zet APP_ENV=local in .env.local (vercel env pull haalt hem weg). In een deploy: haal AUTH_DEV_LOGIN weg."
      : `AUTH_DEV_LOGIN staat aan in de omgeving ${environment}. Dat mag nooit. Haal de variabele daar weg.`,
  );
}

export const devLoginEnabled = isEnabled && environment === "local";

export const devLoginProvider: LoginProvider = {
  id: DEV_LOGIN_PROVIDER_ID,
  rolesFrom: "token",

  create: () =>
    Credentials({
      id: DEV_LOGIN_PROVIDER_ID,
      name: "Dev-login",
      credentials: {
        email: { label: "E-mailadres van een dev-account", type: "text" },
        roles: { label: `Rollen, komma-gescheiden (${APP_ROLES.join(", ")})`, type: "text" },
      },

      async authorize(credentials) {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        if (email === "") return null;

        const user = await findUserByEmail(email);
        if (user === undefined || !user.isActive) return null;

        /* Rollen uit het formulier, en anders die van het account. Door parseRoles, dus een tikfout levert geen rechten op. */
        const requested =
          typeof credentials?.roles === "string" && credentials.roles.trim() !== ""
            ? parseRoles(credentials.roles.split(",").map((role) => role.trim()))
            : undefined;
        const roles: AppRole[] = requested ?? parseRoles(user.roles);

        return { id: user.id, name: user.displayName, email, roles };
      },
    }),

  /*
   * Met opzet zonder `roles` naar de synchronisatie: de rolkeuze in de dev-login is een lokale fictie
   * en hoort niet in de kolom die de bron hoort te weerspiegelen.
   */
  resolve: (user) => {
    const email = (user.email ?? "").trim().toLowerCase();
    return syncUserFromToken({ externalId: `dev:${email}`, email, displayName: user.name ?? email });
  },
};
