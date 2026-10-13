import type { JobHandlers } from "./handler";

/**
 * De handlers van dit project: per `<system>:<operation>` de code die de taak echt uitvoert. Zie
 * lib/jobs/handler.ts voor het contract en template/modules/jobs/claude.md voor de regels.
 *
 * Dit bestand is van het project en blijft staan bij een update van het template. Een voorbeeld:
 *
 *   import { done, waiting } from "./handler";
 *   import { createContact, findContact } from "@/lib/integrations/crm";
 *
 *   export const JOB_HANDLERS: JobHandlers = {
 *     "crm:create_contact": async (job) => {
 *       const existing = await findContact(job.entityId);        // idempotent: eerst kijken
 *       if (existing !== undefined) return done({ id: existing.id });
 *       const parent = await findCompany(...);
 *       if (parent === undefined) return waiting("het bedrijf bestaat nog niet");
 *       return done(await createContact(job.request));
 *     },
 *   };
 */
export const JOB_HANDLERS: JobHandlers = {};
