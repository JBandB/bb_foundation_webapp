/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De compositieroot van de authenticatie. Dit bestand zet alleen de onderdelen bij elkaar:
 *
 *   lib/auth/providers/            de inlogmethoden van de toegepaste modules, plus de dev-login
 *   lib/auth/callbacks.ts          jwt en session
 *   lib/auth/token.ts              onze velden op de JWT
 *   lib/auth/session.ts            requireSession() voor de applicatie
 *   lib/auth/can.ts                de rechtenmatrix
 *
 * De sessie is een JWT en niet een databaserij. Rollen komen uit de inlogmodule en worden bij het
 * inloggen in die JWT gezet (bij de wachtwoordlogin ververst `currentActor` ze per verzoek). De
 * `roles`-kolom in de database is bij Entra een cache voor overzichten en wordt door autorisatie
 * nooit gelezen. Zie CLAUDE.md regel 1.
 *
 * Gevolg van een JWT-sessie: een rolwijziging in Entra landt pas bij de volgende login. Daarom staat
 * de sessie op acht uur en niet op dertig dagen. Iemand die uit de tenant gaat verliest daarmee
 * binnen een werkdag toegang, en wie op Beheer wordt uitgeschakeld meteen (de actief-check in
 * `currentActor`).
 */

import NextAuth from "next-auth";
import { jwtCallback, sessionCallback } from "@/lib/auth/callbacks";
import { loginProviders } from "@/lib/auth/providers";
import { SIGN_IN_PATH } from "@/lib/auth/paths";

/** Acht uur, zie de toelichting hierboven. */
const SESSION_MAX_AGE_SECONDS = 8 * 60 * 60;

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: loginProviders().map((provider) => provider.create()),
  session: { strategy: "jwt", maxAge: SESSION_MAX_AGE_SECONDS },
  pages: { signIn: SIGN_IN_PATH },
  callbacks: { jwt: jwtCallback, session: sessionCallback },
});
