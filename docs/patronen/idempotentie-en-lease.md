<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Idempotentie en lease

**Wanneer.** Elke schrijfactie naar een ander systeem: een record aanmaken in een CRM, een mail
sturen, een bestand ergens neerzetten. Alles wat twee keer uitvoeren schade doet.

**Het patroon.** De actie is een rij in een tabel met een **unieke idempotentiesleutel** die zegt
wat je wilt bereiken, uit je eigen id en de operatie (`crm:create_contact:<personId>`), nooit iets
tijdgebondens. Twee keer inzetten is één rij (`on conflict do nothing`). Een ronde eist rijen op met
één statement, `for update skip locked`, en zet een **lease** (`claimed_until`) zodat een tweede
ronde die tegelijk loopt dezelfde rijen overslaat. Klaar of mislukt maakt de lease weer leeg; valt
een ronde om, dan komt de rij na vijf minuten vanzelf terug. De uitvoerende code is zelf ook
idempotent: eerst kijken of het al bestaat, dan pas aanmaken.

```sql
update jobs set claimed_until = now() + make_interval(mins => 5), updated_at = now()
where id in (
  select id from jobs
  where status::text in ('pending', 'waiting')
    and (claimed_until is null or claimed_until < now())
  order by created_at
  limit 50
  for update skip locked
)
returning id, system, operation, entity_id, attempts, request;
```

```ts
await enqueueJob(tx, { organisationId, system: "crm", operation: "create_contact", entityType: "person", entityId: person.id, idempotencyKey: `crm:create_contact:${person.id}`, request: { name: person.name } });
kickJobs("crm");
```

**Wat het kost.** Een tabel, een cron en een scherm. En de discipline om nooit rechtstreeks vanuit een
server action naar buiten te praten. In een eerder project maakten de cron en een knop op Beheer
tegelijk hetzelfde work item aan, dat daarna nooit meer weg mocht; sindsdien is de lease niet
optioneel.

**Waar in het template.** Module jobs: `lib/jobs/queue.ts`, `lib/jobs/lease.ts` (`claimRows`, de ene
query voor elke tabel), `lib/jobs/run.ts`. De outbox van messaging gebruikt dezelfde lease.
