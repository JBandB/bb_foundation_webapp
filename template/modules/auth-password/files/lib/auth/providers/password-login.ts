/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De wachtwoordlogin als Auth.js Credentials-provider. Eén foutmelding voor onbekend adres, fout
 * wachtwoord en vergrendeld (`PasswordSigninError`), en twee aparte uitkomsten die het inlogscherm
 * anders laat zien: de code uit de app is nodig (`MfaCodeRequired`), of tweestapsverificatie moet
 * eerst worden ingesteld (`MfaSetupRequired`, met een koppeling per mail).
 *
 * De rollen komen uit `users.roles` (`rolesFrom: "database"`): een beheerder zet ze op Beheer,
 * Accounts, en `currentActor` leest ze bij elk verzoek.
 */
import { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { eq } from "drizzle-orm";
import type { LoginProvider } from "@/lib/auth/login-provider";
import { accountByEmail, sendMfaSetupLink } from "@/lib/auth/password/accounts";
import { hashPassword, verifyPassword } from "@/lib/auth/password/hash";
import { allowAttemptFrom, isLocked, recordFailure, recordSuccess } from "@/lib/auth/password/lockout";
import { mfaRequiredFor } from "@/lib/auth/password/mfa-policy";
import { appOrigin } from "@/lib/auth/password/origin";
import { boxKeyFromEnv, open } from "@/lib/auth/password/secret-box";
import { verifyTotp } from "@/lib/auth/password/totp";
import { parseRoles } from "@/lib/auth/roles";
import { findUserById } from "@/lib/auth/user-sync";
import { getDb } from "@/lib/db/client";
import { credentials, organisations } from "@/lib/db/schema";
import { callerAddress } from "@/lib/domain/rate-limit";
import { kickOutbox } from "@/lib/messaging/kick";

export const PASSWORD_PROVIDER_ID = "password";

export class PasswordSigninError extends CredentialsSignin {
  override code = "password";
}

export class MfaCodeRequired extends CredentialsSignin {
  override code = "mfa";
}

export class MfaSetupRequired extends CredentialsSignin {
  override code = "mfa_setup";
}

/** Een hash om tegen te vergelijken als het account niet bestaat, zodat die weg even lang duurt. */
let dummyHash: Promise<string> | undefined;
function dummy(): Promise<string> {
  dummyHash ??= hashPassword(`dummy-${Math.random()}`);
  return dummyHash;
}

const text = (value: unknown): string => (typeof value === "string" ? value : "");

export const passwordLoginProvider: LoginProvider = {
  id: PASSWORD_PROVIDER_ID,
  rolesFrom: "database",

  create: () =>
    Credentials({
      id: PASSWORD_PROVIDER_ID,
      name: "Wachtwoord",
      credentials: {
        email: { label: "E-mailadres", type: "email" },
        password: { label: "Wachtwoord", type: "password" },
        code: { label: "Code", type: "text" },
      },

      async authorize(raw, request) {
        const email = text(raw?.email).trim().toLowerCase();
        const password = text(raw?.password);
        const code = text(raw?.code).trim();
        const address = callerAddress(request.headers.get("x-forwarded-for"));
        const db = getDb();

        const organisation = (await db.select({ id: organisations.id }).from(organisations).limit(1))[0];
        if (organisation === undefined) throw new PasswordSigninError();
        if (!(await allowAttemptFrom(db, organisation.id, address))) throw new PasswordSigninError();

        const account = email === "" ? undefined : await accountByEmail(db, email);
        const stored = account === undefined ? undefined : (await db.select().from(credentials).where(eq(credentials.userId, account.id)).limit(1))[0];
        if (account === undefined || !account.isActive || stored === undefined) {
          await verifyPassword(password, await dummy());
          throw new PasswordSigninError();
        }
        if (isLocked(stored)) throw new PasswordSigninError();

        if (!(await verifyPassword(password, stored.passwordHash))) {
          await recordFailure(db, account.id);
          throw new PasswordSigninError();
        }

        const roles = parseRoles(account.roles);
        if (stored.mfaEnabled) {
          if (code === "") throw new MfaCodeRequired();
          const secret = stored.mfaSecret === null ? undefined : open(stored.mfaSecret, boxKeyFromEnv());
          if (secret === undefined || !verifyTotp(secret, code)) {
            await recordFailure(db, account.id);
            throw new PasswordSigninError();
          }
        } else if (mfaRequiredFor(roles)) {
          await sendMfaSetupLink(db, account, await appOrigin());
          kickOutbox();
          throw new MfaSetupRequired();
        }

        await recordSuccess(db, account.id);
        return { id: account.id, name: account.displayName, email: account.email, roles };
      },
    }),

  /* De rij bestaat al (uitgenodigd en aangenomen); er is geen token om mee te synchroniseren. */
  resolve: async (user) => {
    const found = await findUserById(user.id ?? "");
    if (found === undefined) throw new Error("Het account van deze login bestaat niet meer.");
    return found;
  },
};
