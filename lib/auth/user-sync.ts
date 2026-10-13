/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De brug tussen een identiteit van de inlogmodule en de `users`-rij. Loopt bij elke login.
 *
 * Dit bestand doet één ding: zorgen dat de ingelogde persoon precies één rij heeft, en dat die rij
 * actueel is.
 *
 * ---
 *
 * **De enige plek waar regel 2 niet geldt, en waarom.**
 *
 * CLAUDE.md regel 2 zegt dat elke query op een tabel met domeinbetekenis een `organisation_id`
 * meekrijgt. De queries hieronder doen dat niet, en dat kan hier niet anders: bij het inloggen is de
 * organisatie nog onbekend, want die volgt juist uit de gebruiker die we aan het zoeken zijn. Het is
 * een kip en een ei, en dit is het enige punt in de applicatie waar dat zo is.
 *
 * Wat het veilig maakt is de index `one_organisation` uit de tweede migratie: er kan er maar één
 * zijn, dus "de organisatie" is eenduidig en een query zonder filter kan niet per ongeluk over een
 * grens heen kijken. **Kopieer dit patroon nergens anders naartoe.**
 */

import { eq, sql } from "drizzle-orm";
import { getDb } from "@/lib/db/client";
import { organisations, users } from "@/lib/db/schema";
import { initialsOf } from "@/lib/domain/initials";
import { normaliseDisplayName } from "./display-name";
import type { AppRole } from "./roles.generated";

export interface SyncInput {
  /** Wie dit is bij de inlogmodule: de Entra object-id, `local:<uuid>` of `dev:<adres>`. */
  readonly externalId: string;
  readonly email: string;
  readonly displayName: string;
  /**
   * De rollen zoals de inlogmodule ze zegt, als die module de bron is (Entra). Laat dit weg als de
   * bron niet de module is: de dev-login verzint rollen om lokaal van perspectief te wisselen, en die
   * verzinsels horen niet in een kolom die zich voordoet als afspiegeling van de bron.
   */
  readonly roles?: readonly AppRole[];
}

export interface SyncedUser {
  readonly id: string;
  readonly organisationId: string;
  readonly displayName: string;
  readonly initials: string;
  readonly email: string;
  /** Wat er in `users.roles` staat na deze login. Bij de wachtwoordlogin is dit de bron. */
  readonly roles: string[];
}

const RETURNING = {
  id: users.id,
  organisationId: users.organisationId,
  displayName: users.displayName,
  initials: users.initials,
  email: users.email,
  roles: users.roles,
} as const;

/**
 * Zoekt de gebruiker, werkt hem bij, en maakt hem aan als hij nog niet bestaat.
 *
 * Zoeken gebeurt in twee stappen, en die tweede is het punt van deze functie. Een dev-account heeft
 * `dev:<adres>` als external_id, en een collega die vóór een reparatie inlogde kan een oud id dragen.
 * Zou er alleen op external_id gematcht worden, dan levert de eerste echte login een tweede rij op
 * voor dezelfde persoon. Daarom valt de lookup terug op het e-mailadres, en wordt het echte id
 * daarna op die bestaande rij gezet. De unieke index op `lower(email)` maakt die stap eenduidig.
 */
export async function syncUserFromToken(input: SyncInput): Promise<SyncedUser> {
  const db = getDb();
  const email = input.email.trim().toLowerCase();

  /*
   * Zonder e-mailadres komt niemand binnen. Zou een lege string doorlopen, dan zoekt `findExisting`
   * op `email = ''` en matcht daarmee elke andere rij die om dezelfde reden leeg is gebleven: twee
   * mensen op één rij.
   */
  if (email === "") {
    throw new Error("Het token bevat geen e-mailadres. Controleer of de inlogmodule de claims email en preferred_username meestuurt.");
  }

  const organisation = (await db.select({ id: organisations.id }).from(organisations).limit(1))[0];
  if (organisation === undefined) {
    throw new Error("Er is nog geen organisatie in de database. Draai eerst: pnpm db:bootstrap");
  }

  const existing = await findExisting(input.externalId, email);
  const displayName = normaliseDisplayName(input.displayName);

  const values = {
    externalId: input.externalId,
    email,
    displayName,
    initials: initialsOf(displayName),
    updatedAt: sql`now()`,
    ...(input.roles === undefined ? {} : { roles: [...input.roles] }),
  };

  const rows =
    existing === undefined
      ? await db.insert(users).values({ organisationId: organisation.id, ...values }).returning(RETURNING)
      : await db.update(users).set(values).where(eq(users.id, existing.id)).returning(RETURNING);

  const row = rows[0];
  if (row === undefined) throw new Error(`De gebruiker ${email} kon niet worden bijgewerkt.`);
  return row;
}

/** Eerst op external_id, en anders op e-mailadres. Zie de toelichting hierboven. */
async function findExisting(externalId: string, email: string): Promise<{ id: string } | undefined> {
  const db = getDb();
  const byExternalId = (await db.select({ id: users.id }).from(users).where(eq(users.externalId, externalId)).limit(1))[0];
  if (byExternalId !== undefined) return byExternalId;
  return (await db.select({ id: users.id }).from(users).where(sql`lower(${users.email}) = ${email}`).limit(1))[0];
}

/** Voor de dev-login en de wachtwoordlogin: bestaat deze gebruiker, en zo ja, welke is het. */
export async function findUserByEmail(email: string): Promise<{ id: string; displayName: string; roles: string[]; isActive: boolean } | undefined> {
  return (
    await getDb()
      .select({ id: users.id, displayName: users.displayName, roles: users.roles, isActive: users.isActive })
      .from(users)
      .where(sql`lower(${users.email}) = ${email.trim().toLowerCase()}`)
      .limit(1)
  )[0];
}

/** De rij op onze eigen id, voor een inlogmodule die de gebruiker al kent. */
export async function findUserById(id: string): Promise<SyncedUser | undefined> {
  return (await getDb().select(RETURNING).from(users).where(eq(users.id, id)).limit(1))[0];
}
