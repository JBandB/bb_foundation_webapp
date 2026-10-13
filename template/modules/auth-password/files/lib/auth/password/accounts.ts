/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De handelingen van de wachtwoordlogin op de database: een uitnodiging aannemen, een wachtwoord
 * herstellen of wijzigen, tweestapsverificatie instellen of uitzetten. Zonder sessie-aannames,
 * zodat zowel de schermen zonder sessie (invite, reset, mfa) als Mijn account ze gebruiken. Wat een
 * beheerder doet, staat in admin.ts.
 */
import { randomUUID } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { appendAuditLog, systemActor, type AuditActor } from "@/lib/db/audit";
import type { DbOrTransaction } from "@/lib/db/client";
import { credentials, users } from "@/lib/db/schema";
import { labels } from "@/lib/i18n/labels";
import { enqueueKind } from "@/lib/messaging/enqueue-kind";
import { PROJECT } from "@/lib/project/config.generated";
import { parseRoles } from "@/lib/auth/roles";
import { hashPassword, verifyPassword } from "./hash";
import { mfaRequiredFor } from "./mfa-policy";
import { checkPassword, type PasswordProblem } from "./policy";
import { boxKeyFromEnv, open, seal } from "./secret-box";
import { consumeAuthToken, createAuthToken, peekAuthToken, revokeAuthTokens } from "./tokens";
import { generateTotpSecret, otpauthUrl, verifyTotp } from "./totp";

export type PasswordResult = { readonly ok: true } | { readonly ok: false; readonly problem: PasswordProblem | "expired" | "wrongCurrent" | "wrongCode" | "required" };

export interface AccountRow {
  readonly id: string;
  readonly organisationId: string;
  readonly email: string;
  readonly displayName: string;
  readonly roles: string[];
  readonly isActive: boolean;
}

export async function accountById(db: DbOrTransaction, userId: string): Promise<AccountRow | undefined> {
  return (
    await db
      .select({ id: users.id, organisationId: users.organisationId, email: users.email, displayName: users.displayName, roles: users.roles, isActive: users.isActive })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
  )[0];
}

export async function accountByEmail(db: DbOrTransaction, email: string): Promise<AccountRow | undefined> {
  return (
    await db
      .select({ id: users.id, organisationId: users.organisationId, email: users.email, displayName: users.displayName, roles: users.roles, isActive: users.isActive })
      .from(users)
      .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()} and ${users.deletedAt} is null`)
      .limit(1)
  )[0];
}

/** De naam van de persoon achter een eenmalige koppeling, voor het formulier; undefined als de koppeling niet (meer) geldt. */
export async function personBehindToken(db: DbOrTransaction, token: string, kind: "invite" | "reset" | "mfa_setup"): Promise<AccountRow | undefined> {
  const found = await peekAuthToken(db, token, kind);
  return found === undefined ? undefined : accountById(db, found.userId);
}

/** Zet (of vervangt) het wachtwoord van een account en maakt de vergrendeling ongedaan. */
async function storePassword(db: DbOrTransaction, account: AccountRow, password: string): Promise<void> {
  const passwordHash = await hashPassword(password);
  await db
    .insert(credentials)
    .values({ userId: account.id, organisationId: account.organisationId, passwordHash })
    .onConflictDoUpdate({ target: credentials.userId, set: { passwordHash, passwordChangedAt: sql`now()`, failedAttempts: 0, lockedUntil: null, updatedAt: sql`now()` } });
}

export async function acceptInvite(db: DbOrTransaction, token: string, password: string, confirmation: string): Promise<PasswordResult> {
  const found = await peekAuthToken(db, token, "invite");
  const account = found === undefined ? undefined : await accountById(db, found.userId);
  if (account === undefined) return { ok: false, problem: "expired" };

  const check = checkPassword(password, account.email, confirmation);
  if (!check.ok) return check;

  const consumed = await consumeAuthToken(db, token, "invite");
  if (consumed === undefined) return { ok: false, problem: "expired" };
  await storePassword(db, account, password);
  await db.update(users).set({ isActive: true, updatedAt: sql`now()` }).where(eq(users.id, account.id));
  await appendAuditLog(db, selfActor(account), { entityTable: "credentials", entityId: account.id, action: "insert", after: { event: "invite_accepted" } });
  return { ok: true };
}

/** Een herstelkoppeling aanvragen. Zegt nooit of het adres bestaat; wat er gebeurt, gebeurt stil. */
export async function requestReset(db: DbOrTransaction, email: string, origin: string): Promise<void> {
  const account = await accountByEmail(db, email);
  if (account === undefined || !account.isActive) return;
  const hasPassword = (await db.select({ userId: credentials.userId }).from(credentials).where(eq(credentials.userId, account.id)).limit(1)).length > 0;
  if (!hasPassword) return;

  await revokeAuthTokens(db, account.id, "reset");
  const token = await createAuthToken(db, { organisationId: account.organisationId, userId: account.id, kind: "reset" });
  await enqueueKind(db, account.organisationId, "password_reset", {
    about: `${account.id}:${randomUUID()}`,
    person: account.email,
    subject: labels.password.resetSubject,
    bodyMd: labels.password.resetBody(account.displayName, `${origin}/sign-in/reset/${token}`),
  });
  await appendAuditLog(db, selfActor(account), { entityTable: "auth_tokens", entityId: account.id, action: "insert", after: { kind: "reset" } });
}

export async function completeReset(db: DbOrTransaction, token: string, password: string, confirmation: string): Promise<PasswordResult> {
  const found = await peekAuthToken(db, token, "reset");
  const account = found === undefined ? undefined : await accountById(db, found.userId);
  if (account === undefined || !account.isActive) return { ok: false, problem: "expired" };

  const check = checkPassword(password, account.email, confirmation);
  if (!check.ok) return check;

  const consumed = await consumeAuthToken(db, token, "reset");
  if (consumed === undefined) return { ok: false, problem: "expired" };
  await storePassword(db, account, password);
  await appendAuditLog(db, selfActor(account), { entityTable: "credentials", entityId: account.id, action: "update", after: { event: "password_reset" } });
  return { ok: true };
}

export async function changePassword(db: DbOrTransaction, actor: AuditActor, current: string, password: string, confirmation: string): Promise<PasswordResult> {
  const account = await accountById(db, actor.id);
  const row = (await db.select({ passwordHash: credentials.passwordHash }).from(credentials).where(eq(credentials.userId, actor.id)).limit(1))[0];
  if (account === undefined || row === undefined) return { ok: false, problem: "expired" };
  if (!(await verifyPassword(current, row.passwordHash))) return { ok: false, problem: "wrongCurrent" };

  const check = checkPassword(password, account.email, confirmation);
  if (!check.ok) return check;
  await storePassword(db, account, password);
  await appendAuditLog(db, actor, { entityTable: "credentials", entityId: actor.id, action: "update", after: { event: "password_changed" } });
  return { ok: true };
}

export interface MfaSetup {
  readonly secret: string;
  readonly otpauth: string;
}

/**
 * Een (nieuw) geheim klaarzetten: versleuteld in de rij, nog niet aan. Staat er al een geheim dat
 * nog niet bevestigd is, dan komt dat terug, zodat een tweede keer laden dezelfde QR toont.
 */
export async function beginMfaSetup(db: DbOrTransaction, userId: string): Promise<MfaSetup | undefined> {
  const account = await accountById(db, userId);
  const row = (await db.select({ mfaSecret: credentials.mfaSecret, mfaEnabled: credentials.mfaEnabled }).from(credentials).where(eq(credentials.userId, userId)).limit(1))[0];
  if (account === undefined || row === undefined) return undefined;

  const key = boxKeyFromEnv();
  const pending = row.mfaEnabled || row.mfaSecret === null ? undefined : open(row.mfaSecret, key);
  const secret = pending ?? generateTotpSecret();
  if (pending === undefined) {
    await db.update(credentials).set({ mfaSecret: seal(secret, key), mfaEnabled: false, updatedAt: sql`now()` }).where(eq(credentials.userId, userId));
  }
  return { secret, otpauth: otpauthUrl(PROJECT.name, account.email, secret) };
}

/** De code klopt met het klaargezette geheim: dan staat tweestapsverificatie aan. */
export async function confirmMfaSetup(db: DbOrTransaction, actor: AuditActor, code: string): Promise<PasswordResult> {
  const row = (await db.select({ mfaSecret: credentials.mfaSecret }).from(credentials).where(eq(credentials.userId, actor.id)).limit(1))[0];
  const secret = row?.mfaSecret === null || row?.mfaSecret === undefined ? undefined : open(row.mfaSecret, boxKeyFromEnv());
  if (secret === undefined) return { ok: false, problem: "expired" };
  if (!verifyTotp(secret, code)) return { ok: false, problem: "wrongCode" };

  await db.update(credentials).set({ mfaEnabled: true, updatedAt: sql`now()` }).where(eq(credentials.userId, actor.id));
  await appendAuditLog(db, actor, { entityTable: "credentials", entityId: actor.id, action: "update", after: { event: "mfa_enabled" } });
  return { ok: true };
}

/** De stap na een login die tweestapsverificatie eist: via de koppeling uit de mail. */
export async function confirmMfaSetupByToken(db: DbOrTransaction, token: string, code: string): Promise<PasswordResult> {
  const found = await peekAuthToken(db, token, "mfa_setup");
  const account = found === undefined ? undefined : await accountById(db, found.userId);
  if (account === undefined) return { ok: false, problem: "expired" };
  const result = await confirmMfaSetup(db, selfActor(account), code);
  if (result.ok) await consumeAuthToken(db, token, "mfa_setup");
  return result;
}

export async function disableMfa(db: DbOrTransaction, actor: AuditActor, code: string): Promise<PasswordResult> {
  const account = await accountById(db, actor.id);
  if (account === undefined) return { ok: false, problem: "expired" };
  if (mfaRequiredFor(parseRoles(account.roles))) return { ok: false, problem: "required" };

  const row = (await db.select({ mfaSecret: credentials.mfaSecret, mfaEnabled: credentials.mfaEnabled }).from(credentials).where(eq(credentials.userId, actor.id)).limit(1))[0];
  const secret = row?.mfaEnabled === true && row.mfaSecret !== null ? open(row.mfaSecret, boxKeyFromEnv()) : undefined;
  if (secret === undefined) return { ok: false, problem: "expired" };
  if (!verifyTotp(secret, code)) return { ok: false, problem: "wrongCode" };

  await db.update(credentials).set({ mfaSecret: null, mfaEnabled: false, updatedAt: sql`now()` }).where(eq(credentials.userId, actor.id));
  await appendAuditLog(db, actor, { entityTable: "credentials", entityId: actor.id, action: "update", after: { event: "mfa_disabled" } });
  return { ok: true };
}

/** De koppeling om tweestapsverificatie in te stellen, per mail, bij een login die dat eist. */
export async function sendMfaSetupLink(db: DbOrTransaction, account: AccountRow, origin: string): Promise<void> {
  await revokeAuthTokens(db, account.id, "mfa_setup");
  const token = await createAuthToken(db, { organisationId: account.organisationId, userId: account.id, kind: "mfa_setup" });
  await enqueueKind(db, account.organisationId, "mfa_setup", {
    about: `${account.id}:${randomUUID()}`,
    person: account.email,
    subject: labels.password.mfaTitle,
    bodyMd: [labels.password.mfaSetupRequired, "", `${origin}/sign-in/mfa/${token}`].join("\n"),
  });
}

export interface SecurityState {
  readonly hasPassword: boolean;
  readonly mfaEnabled: boolean;
  readonly mfaRequired: boolean;
}

export async function securityState(db: DbOrTransaction, userId: string): Promise<SecurityState> {
  const account = await accountById(db, userId);
  const row = (await db.select({ mfaEnabled: credentials.mfaEnabled }).from(credentials).where(eq(credentials.userId, userId)).limit(1))[0];
  return { hasPassword: row !== undefined, mfaEnabled: row?.mfaEnabled ?? false, mfaRequired: account === undefined ? false : mfaRequiredFor(parseRoles(account.roles)) };
}

/** Wie iets met zijn eigen account doet zonder sessie (invite, reset), is zelf de actor in de audit log. */
function selfActor(account: AccountRow): AuditActor {
  return { id: account.id, email: account.email, organisationId: account.organisationId };
}

export { systemActor };
