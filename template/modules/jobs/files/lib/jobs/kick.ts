/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De rij verwerken meteen na het antwoord op het verzoek dat hem vulde.
 *
 * Op Vercel Hobby draait een cron hoogstens één keer per dag, en ook elk kwartier (Pro) is te traag
 * voor "ik druk op opslaan en de mail gaat". Daarom roept een server action na het inzetten
 * `kickJobs()` aan: `after()` uit Next.js laat de ronde lopen nadat het antwoord de deur uit is,
 * binnen dezelfde serverless-aanroep. De cron blijft het vangnet voor wat hier misgaat.
 *
 * Buiten een verzoek (een script, een test) bestaat er geen "na het antwoord"; dan doet deze functie
 * niets en doen `pnpm task:jobs` of de cron het werk.
 */
import { after } from "next/server";
import { getDb } from "@/lib/db/client";
import { processJobs } from "./run";

export function kickJobs(system?: string): void {
  try {
    after(async () => {
      try {
        await processJobs(getDb(), { system });
      } catch (error) {
        console.error("jobs: de ronde na het antwoord mislukte", error instanceof Error ? error.message : error);
      }
    });
  } catch {
    /* Geen verzoek in uitvoering: de cron of pnpm task:jobs neemt het over. */
  }
}
