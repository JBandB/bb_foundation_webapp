/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm check:auth-password`: de sloten van de wachtwoordlogin, tegen de dev-branch, alles
 * teruggedraaid. Tokens zijn eenmalig en verlopen, de vergrendeling slaat dicht na vijf pogingen,
 * een uitnodiging leidt tot een account met wachtwoord, tweestapsverificatie gaat aan en uit met
 * een echte code, en het token om die in te stellen komt alleen na het juiste wachtwoord. Heeft AUTH_SECRET nodig (voor het versleutelde geheim).
 */
import { randomUUID } from "node:crypto";
import { eq } from "drizzle-orm";
import type { Actor } from "../lib/auth/actor";
import { acceptInvite, beginMfaSetup, confirmMfaSetup, disableMfa, issueMfaSetupToken, securityState } from "../lib/auth/password/accounts";
import { createInviteLink, inviteUser, listAccounts, setActive, setRoles } from "../lib/auth/password/admin";
import { hashPassword, verifyPassword } from "../lib/auth/password/hash";
import { isLocked, LOCKOUT, recordFailure, recordSuccess } from "../lib/auth/password/lockout";
import { mfaRequiredFor } from "../lib/auth/password/mfa-policy";
import { consumeAuthToken, createAuthToken, peekAuthToken, revokeAuthTokens } from "../lib/auth/password/tokens";
import { counterFor, totpCode } from "../lib/auth/password/totp";
import { ADMIN_ROLES, APP_ROLES } from "../lib/auth/roles";
import { credentials, users } from "../lib/db/schema";
import { createChecker, inRollback, requireContext } from "./lib/check";
import { scriptDb, withDirectDb } from "./lib/connection";
import { runScript } from "./lib/run";

runScript(async () => {
  await withDirectDb(async (pool) => {
    const db = scriptDb(pool);
    const ctx = await requireContext(db);
    const t = createChecker();
    const admin: Actor = { id: ctx.userId, organisationId: ctx.organisationId, name: "Check", email: ctx.email, initials: "CK", roles: [...ADMIN_ROLES] };
    const plainRole = APP_ROLES.find((role) => !ADMIN_ROLES.includes(role)) ?? APP_ROLES[0];
    const origin = "https://check.invalid";

    t.section("1. Wachtwoorden: hash met eigen zout, verificatie in constante tijd");
    const hash = await hashPassword("correct paard batterij nietje");
    t.ok("het juiste wachtwoord past", await verifyPassword("correct paard batterij nietje", hash));
    t.ok("een ander niet", !(await verifyPassword("verkeerd paard", hash)));

    t.section("2. Eenmalige tokens");
    await inRollback(db, async (tx) => {
      const raw = await createAuthToken(tx, { organisationId: ctx.organisationId, userId: ctx.userId, kind: "reset" });
      t.ok("kijken laat hem staan", (await peekAuthToken(tx, raw, "reset"))?.userId === ctx.userId);
      t.ok("een andere soort kent hem niet", (await peekAuthToken(tx, raw, "invite")) === undefined);
      t.ok("innemen lukt één keer", (await consumeAuthToken(tx, raw, "reset"))?.userId === ctx.userId);
      t.ok("en daarna niet meer", (await consumeAuthToken(tx, raw, "reset")) === undefined);
      const second = await createAuthToken(tx, { organisationId: ctx.organisationId, userId: ctx.userId, kind: "reset" });
      await revokeAuthTokens(tx, ctx.userId, "reset");
      t.ok("intrekken maakt een nieuw token ongeldig", (await peekAuthToken(tx, second, "reset")) === undefined);
      const expired = await createAuthToken(tx, { organisationId: ctx.organisationId, userId: ctx.userId, kind: "reset", ttlMinutes: -1 });
      t.ok("een verlopen token is niets waard", (await peekAuthToken(tx, expired, "reset")) === undefined);
    });

    t.section("3. Vergrendeling na vijf mislukte pogingen");
    await inRollback(db, async (tx) => {
      const user = (await tx.insert(users).values({ organisationId: ctx.organisationId, externalId: `local:${randomUUID()}`, email: `check-lock-${randomUUID()}@voorbeeld.invalid`, displayName: "Check Lock", initials: "CL", roles: [plainRole] }).returning({ id: users.id }))[0];
      if (user === undefined) throw new Error("geen testgebruiker");
      await tx.insert(credentials).values({ userId: user.id, organisationId: ctx.organisationId, passwordHash: hash });
      for (let attempt = 0; attempt < LOCKOUT.attempts - 1; attempt += 1) await recordFailure(tx, user.id);
      let row = (await tx.select({ lockedUntil: credentials.lockedUntil, failedAttempts: credentials.failedAttempts }).from(credentials).where(eq(credentials.userId, user.id)))[0];
      t.check("vier pogingen tellen maar vergrendelen niet", [row === undefined ? -1 : row.failedAttempts, row !== undefined && isLocked(row)], [LOCKOUT.attempts - 1, false]);
      await recordFailure(tx, user.id);
      row = (await tx.select({ lockedUntil: credentials.lockedUntil, failedAttempts: credentials.failedAttempts }).from(credentials).where(eq(credentials.userId, user.id)))[0];
      t.ok("de vijfde vergrendelt een kwartier", row !== undefined && isLocked(row));
      await recordSuccess(tx, user.id);
      row = (await tx.select({ lockedUntil: credentials.lockedUntil, failedAttempts: credentials.failedAttempts }).from(credentials).where(eq(credentials.userId, user.id)))[0];
      t.ok("een geslaagde login maakt het ongedaan", row !== undefined && !isLocked(row) && row.failedAttempts === 0);
    });

    t.section("4. Uitnodigen, aannemen, en de lijst op Beheer, Accounts");
    await inRollback(db, async (tx) => {
      const email = `check-invite-${randomUUID()}@voorbeeld.invalid`;
      const invited = await inviteUser(tx, admin, { email, displayName: "Check Invite", roles: [plainRole] }, origin);
      t.check("uitnodigen lukt", invited, { ok: true });
      t.check("nog een keer hetzelfde adres wordt geweigerd", await inviteUser(tx, admin, { email, displayName: "Dubbel", roles: [plainRole] }, origin), { ok: false, problem: "exists" });
      t.check("zonder geldig adres ook", await inviteUser(tx, admin, { email: "geen adres", displayName: "X", roles: [] }, origin), { ok: false, problem: "invalid" });

      const account = (await listAccounts(tx, admin)).find((row) => row.email === email);
      t.check("de lijst toont hem als uitgenodigd, zonder 2FA", [account?.status, account?.mfaEnabled, account?.roles], ["invited", false, [plainRole]]);
      if (account === undefined) return;

      const link = await createInviteLink(tx, admin, account.id, origin);
      const token = link?.split("/").pop() ?? "";
      t.check("het wachtwoord moet aan de regel voldoen", await acceptInvite(tx, token, "kort", "kort"), { ok: false, problem: "tooShort" });
      t.check("aannemen met een goed wachtwoord lukt", await acceptInvite(tx, token, "correct paard batterij nietje", "correct paard batterij nietje"), { ok: true });
      t.check("de koppeling is daarna op", await acceptInvite(tx, token, "correct paard batterij nietje", "correct paard batterij nietje"), { ok: false, problem: "expired" });
      t.check("de lijst toont hem nu als actief", (await listAccounts(tx, admin)).find((row) => row.email === email)?.status, "active");

      t.check("rollen wijzigen lukt", await setRoles(tx, admin, account.id, [plainRole, ADMIN_ROLES[0] ?? ""]), { ok: true });
      t.check("jezelf deactiveren kan niet", await setActive(tx, admin, ctx.userId, false), { ok: false, problem: "self" });
      t.check("een ander deactiveren wel", await setActive(tx, admin, account.id, false), { ok: true });
      t.check("en dan staat hij op inactief", (await listAccounts(tx, admin)).find((row) => row.email === email)?.status, "inactive");
    });

    t.section("5. Tweestapsverificatie met een echte code");
    await inRollback(db, async (tx) => {
      const user = (await tx.insert(users).values({ organisationId: ctx.organisationId, externalId: `local:${randomUUID()}`, email: `check-mfa-${randomUUID()}@voorbeeld.invalid`, displayName: "Check Mfa", initials: "CM", roles: [plainRole] }).returning({ id: users.id, email: users.email }))[0];
      if (user === undefined) throw new Error("geen testgebruiker");
      await tx.insert(credentials).values({ userId: user.id, organisationId: ctx.organisationId, passwordHash: hash });
      const self: Actor = { id: user.id, organisationId: ctx.organisationId, name: "Check Mfa", email: user.email, initials: "CM", roles: [plainRole] };

      const setup = await beginMfaSetup(tx, user.id);
      t.ok("er komt een geheim met een otpauth-koppeling", setup !== undefined && setup.otpauth.startsWith("otpauth://totp/"));
      if (setup === undefined) return;
      t.check("dezelfde QR bij opnieuw laden", (await beginMfaSetup(tx, user.id))?.secret, setup.secret);
      t.check("een verkeerde code zet niets aan", await confirmMfaSetup(tx, self, "000000"), { ok: false, problem: "wrongCode" });
      t.check("de code van nu wel", await confirmMfaSetup(tx, self, totpCode(setup.secret, counterFor(new Date()))), { ok: true });
      t.check("de stand zegt aan", (await securityState(tx, user.id)).mfaEnabled, true);
      t.ok("opnieuw beginnen als het al aan staat geeft niets en laat het aan", (await beginMfaSetup(tx, user.id)) === undefined && (await securityState(tx, user.id)).mfaEnabled);

      const required = mfaRequiredFor([plainRole]);
      const off = await disableMfa(tx, self, totpCode(setup.secret, counterFor(new Date())));
      t.check(required ? "uitzetten kan niet als het verplicht is" : "uitzetten met de code lukt", off, required ? { ok: false, problem: "required" } : { ok: true });
    });

    t.section("6. Instellen zonder mail: een token alleen na het juiste wachtwoord");
    await inRollback(db, async (tx) => {
      const adminRole = ADMIN_ROLES[0] ?? plainRole;
      const mail = `check-setup-${randomUUID()}@voorbeeld.invalid`;
      const user = (await tx.insert(users).values({ organisationId: ctx.organisationId, externalId: `local:${randomUUID()}`, email: mail, displayName: "Check Setup", initials: "CS", roles: [adminRole] }).returning({ id: users.id }))[0];
      if (user === undefined) throw new Error("geen testgebruiker");
      await tx.insert(credentials).values({ userId: user.id, organisationId: ctx.organisationId, passwordHash: hash });

      t.ok("een verkeerd wachtwoord geeft geen token", (await issueMfaSetupToken(tx, mail, "verkeerd paard")) === undefined);
      const first = await issueMfaSetupToken(tx, mail, "correct paard batterij nietje");
      if (!mfaRequiredFor([adminRole])) {
        t.ok("niet verplicht voor deze rol: geen token", first === undefined);
        return;
      }
      t.ok("het juiste wachtwoord geeft een token voor deze persoon", first !== undefined && (await peekAuthToken(tx, first, "mfa_setup"))?.userId === user.id);
      const second = await issueMfaSetupToken(tx, mail, "correct paard batterij nietje");
      t.ok("een nieuw token maakt het vorige ongeldig", second !== undefined && first !== undefined && (await peekAuthToken(tx, first, "mfa_setup")) === undefined);

      await tx.update(credentials).set({ lockedUntil: new Date(Date.now() + 60 * 1000) }).where(eq(credentials.userId, user.id));
      t.ok("vergrendeld: geen token", (await issueMfaSetupToken(tx, mail, "correct paard batterij nietje")) === undefined);
      await tx.update(credentials).set({ lockedUntil: null, mfaEnabled: true }).where(eq(credentials.userId, user.id));
      t.ok("al ingesteld: geen token", (await issueMfaSetupToken(tx, mail, "correct paard batterij nietje")) === undefined);
    });

    t.summary("check:auth-password");
  });
});
