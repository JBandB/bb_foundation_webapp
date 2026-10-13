/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De ingang van elke pagina en elke server action die data nodig heeft. Elke server action begint
 * met requireSession() of requireActor() en daarna een expliciete can()-check. Zie CLAUDE.md regel 11.
 */

import { and, eq, isNull } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/auth";
import { getDb } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { callerAddress } from "@/lib/domain/rate-limit";
import { PROJECT } from "@/lib/project/config.generated";
import type { Actor } from "./actor";
import { SIGN_IN_PATH } from "./paths";
import { parseRoles } from "./roles";

export type { Actor } from "./actor";

/** Waar iemand zonder sessie heen gaat. Staat in paths.ts, zonder imports, buiten de kring auth.ts en session.ts. */
export { SIGN_IN_PATH } from "./paths";

/**
 * Geeft de ingelogde gebruiker, of stuurt naar de inlogpagina.
 *
 * Gooit niet: een pagina zonder sessie is geen fout, dat is iemand die nog moet inloggen. Een lege
 * `id` betekent een cookie die niet meer bruikbaar is, bijvoorbeeld van voor een wijziging in de
 * tokenvelden, en die behandelen we hetzelfde als geen sessie.
 */
export async function requireSession(): Promise<Actor> {
  const actor = await currentActor();
  if (actor === undefined) redirect(SIGN_IN_PATH);
  return actor;
}

/** Zelfde, maar voor route handlers en server actions waar een redirect geen zin heeft. Gooit als er geen sessie is. */
export async function requireActor(): Promise<Actor> {
  const actor = await currentActor();
  if (actor === undefined) throw new Error("Je bent niet ingelogd.");
  return actor;
}

/**
 * De ingelogde gebruiker, of niets. **Eén keer per request**, via React `cache`.
 *
 * Ook: is hij nog actief. De sessie staat acht uur vast in de JWT, en zonder deze query zou iemand
 * die op Beheer wordt uitgeschakeld zo lang binnen blijven. Eén query per request, en dat is het
 * waard: uit dienst is uit dienst.
 *
 * Bij de wachtwoordlogin komen de rollen hiervandaan en niet uit het token, zodat een wijziging op
 * Beheer meteen geldt. Bij Entra blijft het token de bron (CLAUDE.md regel 1).
 */
export const currentActor = cache(async (): Promise<Actor | undefined> => {
  const actor = await actorFromSession();
  if (actor === undefined) return undefined;

  const [row] = await getDb()
    .select({ id: users.id, roles: users.roles })
    .from(users)
    .where(and(eq(users.id, actor.id), eq(users.organisationId, actor.organisationId), eq(users.isActive, true), isNull(users.deletedAt)))
    .limit(1);
  if (row === undefined) return undefined;

  return PROJECT.authProvider === "password" ? { ...actor, roles: parseRoles(row.roles) } : actor;
});

async function actorFromSession(): Promise<Actor | undefined> {
  const session = await auth();
  const user = session?.user;
  if (user === undefined || user.id === "") return undefined;

  /*
   * De herkomst van het verzoek erbij, voor de audit log. Uit de headers en niet uit de sessie, want
   * een sessie reist mee over verzoeken en de herkomst hoort per verzoek te kloppen. Faalt stil: een
   * context zonder headers levert gewoon een actor zonder herkomst op.
   */
  try {
    const incoming = await headers();
    return {
      ...user,
      ip: callerAddress(incoming.get("x-forwarded-for")),
      userAgent: incoming.get("user-agent")?.slice(0, 400) ?? undefined,
    };
  } catch {
    return user;
  }
}
