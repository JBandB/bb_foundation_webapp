<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Een jobhandler schrijven

**Wanneer.** Het project heeft de module jobs en wil iets naar een ander systeem schrijven.

**Het patroon.** Een handler is een functie in `lib/jobs/handlers.ts` onder de sleutel
`<systeem>:<operatie>`. Hij krijgt de taak (met `request` zoals ingezet) en de database, en geeft
`done(response)` terug als het klaar is, `waiting(reden)` als iets anders eerst moet (de ouder
bestaat nog niet, de koppeling is niet ingericht), of gooit als het misging (dan telt dat als
poging). Hij is **idempotent**: een ronde kan omvallen nadat de aanroep slaagde en voordat `done` is
gezet, en dan komt de taak terug. Dus eerst kijken of het al bestaat, dan pas aanmaken, en het
antwoord van buiten bewaren in `response` zodat een volgende stap het kan lezen.

```ts
// lib/jobs/handlers.ts
import { done, waiting, type JobHandlers } from "./handler";
import { crmConfigured, crmMissing, createContact, findContactByExternalId } from "@/lib/integrations/crm";

export const JOB_HANDLERS: JobHandlers = {
  "crm:create_contact": async (job) => {
    if (!crmConfigured()) return waiting(`CRM is niet ingericht: ${crmMissing().join(", ")}`);
    const existing = await findContactByExternalId(job.entityId);
    if (existing !== undefined) return done({ id: existing.id });
    const request = job.request as { name: string; email: string };
    const created = await createContact({ externalId: job.entityId, name: request.name, email: request.email });
    await job.db.update(people).set({ crmId: created.id }).where(eq(people.id, job.entityId));
    return done({ id: created.id });
  },
};
```

**Wat het kost.** Een test op het pure deel (het bouwen van het verzoek) en een regel in
`pnpm check:jobs` of een eigen check die de handler met een nepkoppeling door `processJobs` laat
lopen. Een handler die niet idempotent is, maakt op een kwade dag twee contacten.

**Waar in het template.** `lib/jobs/handler.ts` (het contract), `lib/jobs/run.ts` (de ronde), de
seed `lib/jobs/handlers.ts` met een voorbeeld in commentaar.
