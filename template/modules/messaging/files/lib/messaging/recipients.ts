/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Van doelgroep naar adressen. Adressering en geen autorisatie: wie een bericht krijgt, mag daarmee
 * nog niets. De rollen komen uit `users.roles`, bij Entra een cache van het laatste token.
 */
import { and, eq, isNull } from "drizzle-orm";
import { ADMIN_ROLES, isAppRole, type AppRole } from "@/lib/auth/roles";
import type { DbOrTransaction } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { MessageAudience } from "./kinds";

export async function audienceEmails(db: DbOrTransaction, organisationId: string, audience: MessageAudience, person?: string | undefined): Promise<string[]> {
  if (audience === "person") return person === undefined || person.trim() === "" ? [] : [person.trim()];
  const wanted: readonly AppRole[] = audience === "admins" ? ADMIN_ROLES : [roleOf(audience)];
  return emailsWithRole(db, organisationId, wanted);
}

function roleOf(audience: `role:${AppRole}`): AppRole {
  const role = audience.slice("role:".length);
  if (!isAppRole(role)) throw new Error(`Onbekende rol in doelgroep ${audience}`);
  return role;
}

/** De actieve mensen met minstens één van deze rollen, elk adres één keer. */
export async function emailsWithRole(db: DbOrTransaction, organisationId: string, roles: readonly AppRole[]): Promise<string[]> {
  const rows = await db
    .select({ email: users.email, roles: users.roles })
    .from(users)
    .where(and(eq(users.organisationId, organisationId), eq(users.isActive, true), isNull(users.deletedAt)));
  const emails = rows.filter((row) => row.roles.some((role) => (roles as readonly string[]).includes(role))).map((row) => row.email);
  return [...new Set(emails)];
}
