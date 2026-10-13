/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/** `pnpm teams:test`: één proefkaart naar het Teams-kanaal, voor het inrichten van de webhook (handleiding 21). */
import { sendTeams, teamsConfigured, teamsMissing } from "../lib/messaging/teams";
import { PROJECT } from "../lib/project/config.generated";
import { runScript } from "./lib/run";

runScript(async () => {
  if (!PROJECT.messaging.teams) throw new Error("messaging.teams staat uit in project.config.json; zet hem aan en draai pnpm template:generate.");
  if (!teamsConfigured()) throw new Error(`Teams is niet ingericht. Ontbreekt: ${teamsMissing().join(", ")}.`);

  await sendTeams({ subject: `Proefbericht van ${PROJECT.name}`, bodyMd: "Komt dit aan in het kanaal, dan is de webhook ingericht." });
  console.log("Verstuurd. Kijk in het kanaal.");
});
