/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { and, asc, eq, isNull } from "drizzle-orm";
import type { DbOrTransaction } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import type { Actor } from "./actor";
import { assertCan } from "./can";
import { isAppRole, type AppRole } from "./roles";

/**
 * De gebruikers zoals de inlogmodule ze het laatst heeft aangeleverd. Voor het scherm Toegang.
 *
 * **Bij Entra is dit een spiegel en geen bron.** De rollen komen uit het token en worden bij elke
 * login naar `users` gesynchroniseerd, alleen om te tonen. Wat hier staat is dus "zoals het was bij
 * de laatste login"; het scherm zegt dat erbij. **Bij de wachtwoordlogin is dit de bron**, en
 * wijzigen gebeurt op hetzelfde scherm.
 */
export interface StaffRow {
  readonly id: string;
  readonly displayName: string;
  readonly email: string;
  /** De rollen uit het laatste token of uit de database. Onbekende waarden vallen weg in plaats van te crashen. */
  readonly roles: AppRole[];
  readonly isActive: boolean;
  /** Wanneer de rij voor het laatst is bijgewerkt. */
  readonly syncedAt: Date;
}

export async function listStaff(db: DbOrTransaction, actor: Actor): Promise<StaffRow[]> {
  assertCan(actor, "admin:access");

  const rows = await db
    .select({ id: users.id, displayName: users.displayName, email: users.email, roles: users.roles, isActive: users.isActive, syncedAt: users.updatedAt })
    .from(users)
    .where(and(eq(users.organisationId, actor.organisationId), isNull(users.deletedAt)))
    .orderBy(asc(users.displayName));

  return rows.map((row) => ({ ...row, roles: row.roles.filter(isAppRole) }));
}
