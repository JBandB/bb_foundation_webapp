/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Vergrendeling: vijf mislukte pogingen op een account en het staat een kwartier dicht; vijf
 * mislukte pogingen vanaf één adres in een kwartier en dat adres wacht, ook voor accounts die niet
 * bestaan, zodat raden welk adres bestaat even traag is als raden van een wachtwoord. Eén
 * foutmelding voor alles: onbekend adres, verkeerd wachtwoord, vergrendeld.
 */
import { eq, sql } from "drizzle-orm";
import type { DbOrTransaction } from "@/lib/db/client";
import { credentials } from "@/lib/db/schema";
import { consumeRateLimit } from "@/lib/domain/rate-limit";

export const LOCKOUT = { attempts: 5, windowMinutes: 15, lockMinutes: 15 } as const;

/** Mag dit adres nog een poging doen? Telt de poging meteen mee. */
export async function allowAttemptFrom(db: DbOrTransaction, organisationId: string, address: string | undefined): Promise<boolean> {
  if (address === undefined || address === "") return true;
  const gate = await consumeRateLimit(db, { organisationId, key: `login:ip:${address}`, limit: LOCKOUT.attempts, windowMinutes: LOCKOUT.windowMinutes });
  return gate.ok;
}

export function isLocked(row: { lockedUntil: Date | null }, now: Date = new Date()): boolean {
  return row.lockedUntil !== null && row.lockedUntil.getTime() > now.getTime();
}

/** Een mislukte poging: tellen, en bij de vijfde een kwartier dicht. */
export async function recordFailure(db: DbOrTransaction, userId: string, now: Date = new Date()): Promise<void> {
  const row = (await db.select({ failedAttempts: credentials.failedAttempts }).from(credentials).where(eq(credentials.userId, userId)))[0];
  if (row === undefined) return;
  const attempts = row.failedAttempts + 1;
  if (attempts >= LOCKOUT.attempts) {
    await db
      .update(credentials)
      .set({ failedAttempts: 0, lockedUntil: new Date(now.getTime() + LOCKOUT.lockMinutes * 60 * 1000), updatedAt: sql`now()` })
      .where(eq(credentials.userId, userId));
    return;
  }
  await db.update(credentials).set({ failedAttempts: attempts, updatedAt: sql`now()` }).where(eq(credentials.userId, userId));
}

export async function recordSuccess(db: DbOrTransaction, userId: string): Promise<void> {
  await db.update(credentials).set({ failedAttempts: 0, lockedUntil: null, updatedAt: sql`now()` }).where(eq(credentials.userId, userId));
}
