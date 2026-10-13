## Module jobs: achtergrondwerk

- **Elke schrijfactie naar buiten gaat via `enqueueJob`** in `lib/jobs/queue.ts`, binnen de transactie
  van de handeling die hem veroorzaakt, met een idempotentiesleutel van de vorm
  `<system>:<operation>:<onze id>`. Nooit iets tijdgebondens in de sleutel. Nooit rechtstreeks een
  extern systeem aanroepen vanuit een server action.
- **De handler staat in `lib/jobs/handlers.ts`** (van het project) onder `<system>:<operation>` en is
  idempotent: eerst kijken of het al bestaat, dan pas aanmaken. Een handler geeft `done(response)`,
  `waiting(reden)` of gooit; gooien telt als poging, na vijf blijft de taak op mislukt staan.
- **Na het inzetten `kickJobs()`** aanroepen in de server action, zodat de rij meteen na het antwoord
  wordt verwerkt. De cron `/api/cron/jobs` is het vangnet: dagelijks op Vercel Hobby, elk kwartier op
  Pro (zet dat rooster dan in `vercel.json` en het pad in `template.keepCrons`).
- **Eén claim-query**, `claimJobs` in `lib/jobs/lease.ts`, met `for update skip locked` en een lease van
  vijf minuten. Geen tweede variant ervan schrijven; de outbox van messaging gebruikt dezelfde.
- **De stand staat op Beheer, Achtergrondwerk** (`/admin/jobs`, recht `admin:system`) en in de
  koppelingenlijst op Systeem. "Vastgelopen" betekent: er wacht al een uur iets en er is in die tijd
  niets gebeurd. Mislukte taken opnieuw zetten gaat via de knop, met een auditregel per taak.
- **Bewijs:** `pnpm check:jobs` (sleutel, lease, pogingen, ronde, opruimen) en e2e `06-jobs.spec.ts`.
