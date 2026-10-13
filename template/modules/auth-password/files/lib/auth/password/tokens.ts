/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Eenmalige tokens voor een uitnodiging, een wachtwoordherstel en de stap om tweestapsverificatie
 * in te stellen. Het token is 32 willekeurige bytes als base64url; de database kent alleen de
 * sha256 ervan. Innemen is één statement dat alleen slaagt als het token nog niet gebruikt en nog
 * niet verlopen is: twee keer klikken op dezelfde koppeling kan niet twee keer slagen.
 */
import { createHash, randomBytes } from "node:crypto";
import { and, eq, gt, isNull, sql } from "drizzle-orm";
import type { DbOrTransaction } from "@/lib/db/client";
import { authTokens, type AuthTokenKind } from "@/lib/db/schema";

export const TOKEN_TTL_MINUTES: Readonly<Record<AuthTokenKind, number>> = { invite: 7 * 24 * 60, reset: 60, mfa_setup: 15 };

export function tokenHash(raw: string): string {
  return createHash("sha256").update(raw, "utf8").digest("hex");
}

/** Maakt een token en geeft het één keer terug; wat blijft is de hash. */
export async function createAuthToken(db: DbOrTransaction, input: { organisationId: string; userId: string; kind: AuthTokenKind; ttlMinutes?: number }): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  const ttl = input.ttlMinutes ?? TOKEN_TTL_MINUTES[input.kind];
  await db.insert(authTokens).values({
    organisationId: input.organisationId,
    userId: input.userId,
    kind: input.kind,
    tokenHash: tokenHash(raw),
    expiresAt: new Date(Date.now() + ttl * 60 * 1000),
  });
  return raw;
}

/** Kijkt zonder in te nemen: voor het tonen van het formulier achter de koppeling. */
export async function peekAuthToken(db: DbOrTransaction, raw: string, kind: AuthTokenKind): Promise<{ userId: string; organisationId: string } | undefined> {
  if (!isPlausibleToken(raw)) return undefined;
  return (
    await db
      .select({ userId: authTokens.userId, organisationId: authTokens.organisationId })
      .from(authTokens)
      .where(and(eq(authTokens.tokenHash, tokenHash(raw)), eq(authTokens.kind, kind), isNull(authTokens.usedAt), gt(authTokens.expiresAt, sql`now()`)))
      .limit(1)
  )[0];
}

/** Neemt het token in; undefined als het onbekend, gebruikt of verlopen is. */
export async function consumeAuthToken(db: DbOrTransaction, raw: string, kind: AuthTokenKind): Promise<{ userId: string; organisationId: string } | undefined> {
  if (!isPlausibleToken(raw)) return undefined;
  const rows = await db
    .update(authTokens)
    .set({ usedAt: sql`now()`, updatedAt: sql`now()` })
    .where(and(eq(authTokens.tokenHash, tokenHash(raw)), eq(authTokens.kind, kind), isNull(authTokens.usedAt), gt(authTokens.expiresAt, sql`now()`)))
    .returning({ userId: authTokens.userId, organisationId: authTokens.organisationId });
  return rows[0];
}

/** Oudere tokens van dezelfde soort voor dezelfde persoon vervallen zodra er een nieuwe is. */
export async function revokeAuthTokens(db: DbOrTransaction, userId: string, kind: AuthTokenKind): Promise<number> {
  const rows = await db
    .update(authTokens)
    .set({ usedAt: sql`now()`, updatedAt: sql`now()` })
    .where(and(eq(authTokens.userId, userId), eq(authTokens.kind, kind), isNull(authTokens.usedAt)))
    .returning({ id: authTokens.id });
  return rows.length;
}

function isPlausibleToken(raw: string): boolean {
  return /^[A-Za-z0-9_-]{40,48}$/.test(raw);
}
