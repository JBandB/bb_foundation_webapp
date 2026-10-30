/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use server";

import { revalidatePath } from "next/cache";
import { signOut } from "@/auth";
import { SIGN_IN_PATH } from "@/lib/auth/paths";
import { requireActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { loadTheme, saveTheme } from "@/lib/domain/preferences";

/**
 * Uitloggen. Een server action en geen `onClick`, zodat de knop ook werkt zonder JavaScript en de
 * sessiecookie op de server wordt weggegooid. `redirectTo` gaat naar de inlogpagina en niet naar `/`,
 * want `/` stuurt door naar het beginscherm en dat stuurt je meteen weer naar de inlog: een flikkering.
 *
 * session-first: uitloggen zonder sessie doet niets en lekt niets; de huisregel slaat deze action over.
 */
export async function signOutAction(): Promise<void> {
  await signOut({ redirectTo: SIGN_IN_PATH });
}

/**
 * Wisselen tussen licht en donker.
 *
 * Een server action en geen schakelaar in de browser: de modus staat als class op `<html>` in het HTML
 * dat de server verstuurt, dus de wissel moet langs de server, en dan kan hij net zo goed meteen worden
 * opgeslagen. De keuze geldt daarmee ook op de telefoon en op de laptop van morgen.
 *
 * Hij leest eerst: een knop die zijn stand als formulierwaarde meestuurt, zou na een wissel in een
 * ander tabblad de verkeerde kant op klappen.
 */
export async function toggleTheme(): Promise<void> {
  const actor = await requireActor();
  const db = getDb();
  const current = await loadTheme(db, { organisationId: actor.organisationId, userId: actor.id });
  await saveTheme(db, { organisationId: actor.organisationId, userId: actor.id, theme: current === "dark" ? "light" : "dark" });
  /* De modus zit in de root-layout, dus het hele pad moet opnieuw. */
  revalidatePath("/", "layout");
}
