/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wat een beheerder met accounts doet: uitnodigen, rollen zetten, deactiveren, tweestapsverificatie
 * resetten, een herstelkoppeling sturen. Alles achter `admin:access`, alles met een auditregel, en
 * de mails via de outbox.
 */
import { randomUUID } from "node:crypto";
import { and, asc, eq, isNull, sql } from "drizzle-orm";
import type { Actor } from "@/lib/auth/actor";
import { assertCan } from "@/lib/auth/can";
import { ADMIN_ROLES, isAppRole, parseRoles, type AppRole } from "@/lib/auth/roles";
import { appendAuditLog } from "@/lib/db/audit";
import type { DbOrTransaction } from "@/lib/db/client";
import { credentials, users } from "@/lib/db/schema";
import { labels } from "@/lib/i18n/labels";
import { enqueueKind } from "@/lib/messaging/enqueue-kind";
import { accountById, type AccountRow } from "./accounts";
import { isLocked } from "./lockout";
import { createAuthToken, revokeAuthTokens } from "./tokens";

export type AccountStatus = "invited" | "active" | "inactive" | "locked";

export interface AccountListRow {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  readonly roles: AppRole[];
  readonly status: AccountStatus;
  readonly mfaEnabled: boolean;
}

export async function listAccounts(db: DbOrTransaction, actor: Actor): Promise<AccountListRow[]> {
  assertCan(actor, "admin:access");
  const rows = await db
    .select({
      id: users.id,
      displayName: users.displayName,
      email: users.email,
      roles: users.roles,
      isActive: users.isActive,
      hasPassword: credentials.userId,
      mfaEnabled: credentials.mfaEnabled,
      lockedUntil: credentials.lockedUntil,
    })
    .from(users)
    .leftJoin(credentials, eq(credentials.userId, users.id))
    .where(and(eq(users.organisationId, actor.organisationId), isNull(users.deletedAt)))
    .orderBy(asc(users.displayName));

  return rows.map((row) => ({
    id: row.id,
    displayName: row.displayName,
    email: row.email,
    roles: row.roles.filter(isAppRole),
    status: !row.isActive ? "inactive" : row.hasPassword === null ? "invited" : isLocked({ lockedUntil: row.lockedUntil }) ? "locked" : "active",
    mfaEnabled: row.mfaEnabled ?? false,
  }));
}

export type AdminResult = { readonly ok: true } | { readonly ok: false; readonly problem: "exists" | "notFound" | "lastAdmin" | "self" | "invalid" };

export async function inviteUser(db: DbOrTransaction, actor: Actor, input: { email: unknown; displayName: unknown; roles: readonly string[] }, origin: string): Promise<AdminResult> {
  assertCan(actor, "admin:access");
  const email = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
  const displayName = typeof input.displayName === "string" ? input.displayName.trim().slice(0, 200) : "";
  const roles = parseRoles(input.roles);
  if (email === "" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || displayName === "") return { ok: false, problem: "invalid" };

  const existing = (await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1))[0];
  if (existing !== undefined) return { ok: false, problem: "exists" };

  const row = (
    await db
      .insert(users)
      .values({ organisationId: actor.organisationId, externalId: `local:${randomUUID()}`, email, displayName, initials: initialsOf(displayName), roles, isActive: true })
      .returning({ id: users.id })
  )[0];
  if (row === undefined) return { ok: false, problem: "invalid" };

  await appendAuditLog(db, actor, { entityTable: "users", entityId: row.id, action: "insert", after: { email, displayName, roles } });
  await sendInvite(db, actor, { id: row.id, organisationId: actor.organisationId, email, displayName, roles, isActive: true }, origin);
  return { ok: true };
}

export async function resendInvite(db: DbOrTransaction, actor: Actor, userId: string, origin: string): Promise<AdminResult> {
  assertCan(actor, "admin:access");
  const account = await accountById(db, userId);
  if (account === undefined || account.organisationId !== actor.organisationId) return { ok: false, problem: "notFound" };
  await sendInvite(db, actor, account, origin);
  return { ok: true };
}

/**
 * Een verse uitnodigingskoppeling, zonder mail: voor `pnpm invite`, dat de eerste beheerder aanmaakt
 * voordat er een transport is. Elke oudere uitnodiging van dezelfde persoon vervalt.
 */
export async function createInviteLink(db: DbOrTransaction, actor: Actor, userId: string, origin: string): Promise<string | undefined> {
  assertCan(actor, "admin:access");
  const account = await accountById(db, userId);
  if (account === undefined || account.organisationId !== actor.organisationId) return undefined;
  await revokeAuthTokens(db, account.id, "invite");
  const token = await createAuthToken(db, { organisationId: account.organisationId, userId: account.id, kind: "invite" });
  await appendAuditLog(db, actor, { entityTable: "auth_tokens", entityId: account.id, action: "insert", after: { kind: "invite" } });
  return `${origin}/sign-in/invite/${token}`;
}

async function sendInvite(db: DbOrTransaction, actor: Actor, account: AccountRow, origin: string): Promise<void> {
  const link = await createInviteLink(db, actor, account.id, origin);
  if (link === undefined) return;
  await enqueueKind(db, account.organisationId, "account_invite", {
    about: `${account.id}:${randomUUID()}`,
    person: account.email,
    subject: labels.password.inviteSubject,
    bodyMd: labels.password.inviteBody(account.displayName, link),
  });
}

export async function setRoles(db: DbOrTransaction, actor: Actor, userId: string, requested: readonly string[]): Promise<AdminResult> {
  assertCan(actor, "admin:access");
  const account = await accountById(db, userId);
  if (account === undefined || account.organisationId !== actor.organisationId) return { ok: false, problem: "notFound" };
  const roles = parseRoles(requested);

  if (!roles.some((role) => ADMIN_ROLES.includes(role)) && (await isLastAdmin(db, actor.organisationId, userId))) return { ok: false, problem: "lastAdmin" };

  await db.update(users).set({ roles, updatedAt: sql`now()` }).where(eq(users.id, userId));
  await appendAuditLog(db, actor, { entityTable: "users", entityId: userId, action: "update", before: { roles: account.roles }, after: { roles } });
  return { ok: true };
}

export async function setActive(db: DbOrTransaction, actor: Actor, userId: string, active: boolean): Promise<AdminResult> {
  assertCan(actor, "admin:access");
  if (userId === actor.id && !active) return { ok: false, problem: "self" };
  const account = await accountById(db, userId);
  if (account === undefined || account.organisationId !== actor.organisationId) return { ok: false, problem: "notFound" };
  if (!active && (await isLastAdmin(db, actor.organisationId, userId))) return { ok: false, problem: "lastAdmin" };

  await db.update(users).set({ isActive: active, updatedAt: sql`now()` }).where(eq(users.id, userId));
  await appendAuditLog(db, actor, { entityTable: "users", entityId: userId, action: "update", before: { isActive: account.isActive }, after: { isActive: active } });
  return { ok: true };
}

export async function resetMfa(db: DbOrTransaction, actor: Actor, userId: string): Promise<AdminResult> {
  assertCan(actor, "admin:access");
  const account = await accountById(db, userId);
  if (account === undefined || account.organisationId !== actor.organisationId) return { ok: false, problem: "notFound" };
  await db.update(credentials).set({ mfaSecret: null, mfaEnabled: false, updatedAt: sql`now()` }).where(eq(credentials.userId, userId));
  await appendAuditLog(db, actor, { entityTable: "credentials", entityId: userId, action: "update", after: { event: "mfa_reset_by_admin" } });
  return { ok: true };
}

export async function sendResetLink(db: DbOrTransaction, actor: Actor, userId: string, origin: string): Promise<AdminResult> {
  assertCan(actor, "admin:access");
  const account = await accountById(db, userId);
  if (account === undefined || account.organisationId !== actor.organisationId) return { ok: false, problem: "notFound" };
  await revokeAuthTokens(db, account.id, "reset");
  const token = await createAuthToken(db, { organisationId: account.organisationId, userId: account.id, kind: "reset" });
  await enqueueKind(db, account.organisationId, "password_reset", {
    about: `${account.id}:${randomUUID()}`,
    person: account.email,
    subject: labels.password.resetSubject,
    bodyMd: labels.password.resetBody(account.displayName, `${origin}/sign-in/reset/${token}`),
  });
  await appendAuditLog(db, actor, { entityTable: "auth_tokens", entityId: account.id, action: "insert", after: { kind: "reset", by: "admin" } });
  return { ok: true };
}

/** Is dit de enige actieve beheerder? Dan mag zijn rol niet weg en zijn account niet uit. */
async function isLastAdmin(db: DbOrTransaction, organisationId: string, userId: string): Promise<boolean> {
  const rows = await db
    .select({ id: users.id, roles: users.roles })
    .from(users)
    .where(and(eq(users.organisationId, organisationId), eq(users.isActive, true), isNull(users.deletedAt)));
  const admins = rows.filter((row) => parseRoles(row.roles).some((role) => ADMIN_ROLES.includes(role)));
  return admins.length === 1 && admins[0]?.id === userId;
}

function initialsOf(displayName: string): string {
  const parts = displayName.split(/\s+/).filter((part) => part !== "");
  const first = parts[0]?.[0] ?? "?";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : (parts[0]?.[1] ?? "");
  return `${first}${last}`.toUpperCase();
}
