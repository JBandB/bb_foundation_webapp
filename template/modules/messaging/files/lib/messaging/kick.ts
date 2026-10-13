/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De outbox versturen meteen na het antwoord op het verzoek dat hem vulde, net als lib/jobs/kick.ts:
 * op Vercel Hobby draait de cron maar één keer per dag, en een uitnodiging of een herstelmail moet
 * nu komen. De cron blijft het vangnet.
 */
import { after } from "next/server";
import { getDb } from "@/lib/db/client";
import { organisations } from "@/lib/db/schema";
import { sendPending } from "./send";

export function kickOutbox(): void {
  try {
    after(async () => {
      try {
        const db = getDb();
        const organisation = (await db.select({ id: organisations.id }).from(organisations).limit(1))[0];
        if (organisation !== undefined) await sendPending(db, organisation.id);
      } catch (error) {
        console.error("outbox: de verzendronde na het antwoord mislukte", error instanceof Error ? error.message : error);
      }
    });
  } catch {
    /* Geen verzoek in uitvoering: de cron of pnpm task:outbox neemt het over. */
  }
}
