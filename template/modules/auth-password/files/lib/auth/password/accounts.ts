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
import { isLocked } from "./lockout";
import { mfaRequiredFor } from "./mfa-policy";
import { checkPassword, type PasswordProblem } from "./policy";
import { boxKeyFromEnv, openFromEnv, seal } from "./secret-box";
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
 * Staat tweestapsverificatie al aan, dan komt er niets: anders zou een overgebleven instelkoppeling
 * (of een tweede tabblad na het instellen) een nieuw geheim klaarzetten en de tweede factor uitzetten.
 */
export async function beginMfaSetup(db: DbOrTransaction, userId: string): Promise<MfaSetup | undefined> {
  const account = await accountById(db, userId);
  const row = (await db.select({ mfaSecret: credentials.mfaSecret, mfaEnabled: credentials.mfaEnabled }).from(credentials).where(eq(credentials.userId, userId)).limit(1))[0];
  if (account === undefined || row === undefined || row.mfaEnabled) return undefined;

  const opened = row.mfaSecret === null ? undefined : openFromEnv(row.mfaSecret);
  const pending = opened?.plain;
  const secret = pending ?? generateTotpSecret();
  if (pending === undefined || opened?.stale === true) {
    await db.update(credentials).set({ mfaSecret: seal(secret, boxKeyFromEnv()), mfaEnabled: false, updatedAt: sql`now()` }).where(eq(credentials.userId, userId));
  }
  return { secret, otpauth: otpauthUrl(PROJECT.name, account.email, secret) };
}

/** De code klopt met het klaargezette geheim: dan staat tweestapsverificatie aan. */
export async function confirmMfaSetup(db: DbOrTransaction, actor: AuditActor, code: string): Promise<PasswordResult> {
  const row = (await db.select({ mfaSecret: credentials.mfaSecret }).from(credentials).where(eq(credentials.userId, actor.id)).limit(1))[0];
  const secret = row?.mfaSecret === null || row?.mfaSecret === undefined ? undefined : openFromEnv(row.mfaSecret)?.plain;
  if (secret === undefined) return { ok: false, problem: "expired" };
  if (!verifyTotp(secret, code)) return { ok: false, problem: "wrongCode" };

  await db.update(credentials).set({ mfaEnabled: true, updatedAt: sql`now()` }).where(eq(credentials.userId, actor.id));
  await appendAuditLog(db, actor, { entityTable: "credentials", entityId: actor.id, action: "update", after: { event: "mfa_enabled" } });
  return { ok: true };
}

/** De stap na een login die tweestapsverificatie eist: de code bevestigen op de instelpagina. */
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
  const secret = row?.mfaEnabled === true && row.mfaSecret !== null ? openFromEnv(row.mfaSecret)?.plain : undefined;
  if (secret === undefined) return { ok: false, problem: "expired" };
  if (!verifyTotp(secret, code)) return { ok: false, problem: "wrongCode" };

  await db.update(credentials).set({ mfaSecret: null, mfaEnabled: false, updatedAt: sql`now()` }).where(eq(credentials.userId, actor.id));
  await appendAuditLog(db, actor, { entityTable: "credentials", entityId: actor.id, action: "update", after: { event: "mfa_disabled" } });
  return { ok: true };
}

/**
 * De stap na een login die tweestapsverificatie eist, zonder mail: een vers eenmalig token voor de
 * instelpagina (`/sign-in/mfa/<token>`), waar het inlogscherm meteen naartoe stuurt.
 *
 * Waarom niet meer per mail: zonder ingerichte mail kwam de koppeling nooit aan, en het bericht in
 * Beheer, Berichten is pas te zien na inloggen. De eerste beheerder sloot zichzelf zo buiten.
 *
 * Wanneer: alleen als de provider dezelfde aanvraag net met `mfa_setup` weigerde, dus nadat het
 * wachtwoord klopte en de rate limit per adres al was geteld. Toch controleert deze functie alles
 * zelf opnieuw (actief, niet vergrendeld, nog niet ingesteld, wel verplicht, en het wachtwoord),
 * want ze geeft een sleutel uit en mag niet leunen op wat de aanroeper zegt. De provider kan het
 * token niet zelf teruggeven: Auth.js zet de code van een mislukte login in een URL.
 *
 * Het token is hetzelfde soort als dat uit de mail: eenmalig, vijftien minuten geldig, alleen de
 * hash in de database, en een nieuw token maakt het vorige ongeldig. Het staat alleen in het pad
 * van de instelpagina, net als vroeger in de mailkoppeling.
 *
 * De prijs, bewust gekozen: wie het wachtwoord van een beheerder kent die nog geen tweede factor
 * heeft, kan die nu zelf instellen. Met de mail was daar ook de mailbox voor nodig. Het venster is
 * klein: alleen tot de eerste echte login, en het token geeft nooit een sessie.
 */
export async function issueMfaSetupToken(db: DbOrTransaction, email: string, password: string): Promise<string | undefined> {
  const account = email.trim() === "" ? undefined : await accountByEmail(db, email);
  if (account === undefined || !account.isActive) return undefined;
  if (!mfaRequiredFor(parseRoles(account.roles))) return undefined;
  const row = (
    await db
      .select({ passwordHash: credentials.passwordHash, mfaEnabled: credentials.mfaEnabled, lockedUntil: credentials.lockedUntil })
      .from(credentials)
      .where(eq(credentials.userId, account.id))
      .limit(1)
  )[0];
  if (row === undefined || row.mfaEnabled || isLocked(row)) return undefined;
  if (!(await verifyPassword(password, row.passwordHash))) return undefined;

  await revokeAuthTokens(db, account.id, "mfa_setup");
  /*
   * Een vers geheim bij elk nieuw token: het nog niet bevestigde geheim gaat weg, en de instelpagina
   * maakt een nieuw. Anders zag wie eerder met hetzelfde wachtwoord de pagina opende, dezelfde
   * QR-code als de beheerder, en deelden ze één geheim.
   */
  await db.update(credentials).set({ mfaSecret: null, updatedAt: sql`now()` }).where(eq(credentials.userId, account.id));
  const token = await createAuthToken(db, { organisationId: account.organisationId, userId: account.id, kind: "mfa_setup" });
  await appendAuditLog(db, selfActor(account), { entityTable: "auth_tokens", entityId: account.id, action: "insert", after: { kind: "mfa_setup" } });
  return token;
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
