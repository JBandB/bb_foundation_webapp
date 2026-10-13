/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { cache } from "react";
import { currentActor } from "@/lib/auth/session";
import { PROJECT } from "@/lib/project/config.generated";
import { getDb } from "@/lib/db/client";
import { DEFAULT_THEME, loadTheme, type Theme } from "./preferences";

/**
 * De modus van deze bezoeker, één keer per verzoek opgehaald.
 *
 * **Twee plekken hebben hem nodig.** De root-layout zet de class op `<html>`, want de modus moet in
 * het HTML staan dat de server verstuurt: anders ziet wie donker koos eerst een wit scherm dat een tel
 * later omslaat. En het schuifje in de rail heeft de stand nodig voor `aria-checked`. `cache` van
 * React maakt daar één query van.
 *
 * **Wat er misgaat, gaat licht.** Deze functie draait ook voor het inlogscherm, waar geen sessie is.
 * Zonder sessie, zonder rij of bij een databasefout is het antwoord licht: een verkeerde kleur is
 * vervelend, een pagina die niet laadt omdat de kleur niet op te halen was is erger.
 */
export const themeForRequest = cache(async (): Promise<Theme> => {
  try {
    const actor = await currentActor();
    if (actor === undefined || PROJECT.darkMode === "off") return DEFAULT_THEME;
    return await loadTheme(getDb(), { organisationId: actor.organisationId, userId: actor.id });
  } catch {
    return DEFAULT_THEME;
  }
});
