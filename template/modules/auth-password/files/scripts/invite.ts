/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm invite -- adres "Naam" rol1,rol2`: maakt het account aan (als het nog niet bestaat) en drukt
 * de uitnodigingskoppeling af. Voor de eerste beheerder, voordat er een transport voor mail is; de
 * uitnodiging gaat ook de outbox in en wordt verstuurd zodra het transport er is.
 */
import type { Actor } from "../lib/auth/actor";
import { accountByEmail } from "../lib/auth/password/accounts";
import { createInviteLink, inviteUser } from "../lib/auth/password/admin";
import { ADMIN_ROLES, APP_ROLES } from "../lib/auth/roles";
import { closeDb, getDb } from "../lib/db/client";
import { organisations } from "../lib/db/schema";
import { PROJECT } from "../lib/project/config.generated";
import { runScript } from "./lib/run";

runScript(async () => {
  const [email, displayName, rolesArgument] = process.argv.slice(2).filter((argument) => !argument.startsWith("-"));
  if (email === undefined || displayName === undefined) throw new Error('Gebruik: pnpm invite -- adres "Naam" rol1,rol2  (rollen weglaten geeft de eerste beheerdersrol)');
  const roles = rolesArgument === undefined ? [ADMIN_ROLES[0] ?? ""] : rolesArgument.split(",").map((role) => role.trim());
  const unknown = roles.filter((role) => !(APP_ROLES as readonly string[]).includes(role));
  if (unknown.length > 0) throw new Error(`Onbekende rol: ${unknown.join(", ")}. Bekend: ${APP_ROLES.join(", ")}`);

  const origin = (process.env.AUTH_URL ?? PROJECT.productionUrl ?? "").replace(/\/+$/, "");
  if (origin === "") throw new Error("Geen adres voor de koppeling: zet AUTH_URL in .env.local of productionUrl in project.config.json.");

  const db = getDb();
  const organisation = (await db.select({ id: organisations.id }).from(organisations).limit(1))[0];
  if (organisation === undefined) throw new Error("Er is nog geen organisatie; draai eerst pnpm db:bootstrap.");
  const actor: Actor = { id: "", organisationId: organisation.id, name: "invite", email: PROJECT.systemEmail, initials: "IN", roles: [...ADMIN_ROLES] };

  let account = await accountByEmail(db, email);
  if (account === undefined) {
    const result = await inviteUser(db, actor, { email, displayName, roles }, origin);
    if (!result.ok) throw new Error(`Uitnodigen mislukte: ${result.problem}`);
    account = await accountByEmail(db, email);
  }
  if (account === undefined) throw new Error("Het account is niet aangemaakt.");

  const link = await createInviteLink(db, actor, account.id, origin);
  console.log(`Account: ${account.email} (${account.displayName}), rollen: ${account.roles.join(", ")}`);
  console.log(`Koppeling, zeven dagen geldig, één keer te gebruiken:\n\n  ${link}\n`);
  console.log("Geef deze koppeling alleen aan de persoon zelf. Een eerdere uitnodiging voor dit adres is nu ongeldig.");
  await closeDb();
});
