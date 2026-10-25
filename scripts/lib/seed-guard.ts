/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De guard voor alles wat verzonnen gegevens neerzet of een database heen en terug migreert.
 *
 * Je moet de branch met naam noemen. Een eerdere versie keek of er al gebruikers stonden die niet uit
 * een seed kwamen, en concludeerde daaruit dat het productie moest zijn. Dat werkt niet: op een verse
 * productiedatabase heeft nog niemand ingelogd, dus die guard laat precies het geval door waarvoor hij
 * bedoeld was. Deze versie vraagt om een bevestiging die de omgeving benoemt, dus een verkeerde
 * connectiestring valt op in plaats van dat hij wordt gevolgd.
 */

import { deployEnvironment } from "../../lib/domain/deploy-environment";
import { isProductionEndpoint } from "./connection";

export function assertConfirmedTarget(endpoint: string, what: string): void {
  const environment = deployEnvironment();
  if (environment === "preview" || environment === "production") {
    throw new Error(`${what} draait nooit in een deploy (omgeving ${environment}). Dit is iets voor je eigen dev-branch.`);
  }
  if (isProductionEndpoint(endpoint)) {
    throw new Error(`Endpoint ${endpoint} is de productiedatabase (PRODUCTION_DB_ENDPOINT). ${what} hoort daar nooit te draaien.`);
  }
  if (process.env.SEED_TARGET === endpoint) return;

  throw new Error(
    [
      `${what} zou draaien op endpoint ${endpoint}, en dat is niet bevestigd.`,
      `Weet je zeker dat dit je wegwerpbranch is, zet dan in .env.local: SEED_TARGET=${endpoint}`,
      "Voor wat op elke omgeving mag (alleen de organisatie en de referentiegegevens): pnpm db:bootstrap",
    ].join("\n"),
  );
}
