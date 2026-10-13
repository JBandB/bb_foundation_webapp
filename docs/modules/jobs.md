<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Module jobs

Een wachtrij voor elke schrijfactie naar een ander systeem, met een idempotentiesleutel en een
lease. De basis voor elke koppeling naar buiten; `messaging` bouwt erop.

## Hoe het werkt

- `enqueueJob` zet een taak in de tabel `jobs` met een sleutel als `crm:create_contact:<id>`; twee
  keer inzetten is één taak. Een mislukte taak opnieuw inzetten zet hem weer klaar.
- Een ronde eist taken op met `for update skip locked` en een lease van vijf minuten (`claimJobs`),
  geeft elke taak aan de handler van het project (`lib/jobs/handlers.ts`, gesleuteld op
  `<systeem>:<operatie>`) en zet de stand om: klaar, wacht op iets anders, of mislukt. Na vijf
  mislukte pogingen blijft een taak op mislukt staan tot iemand op "opnieuw" drukt.
- De ronde loopt direct na de handeling die de taak inzette (`kickJobs()`, via `after()` van
  Next.js) en elke nacht door de cron `/api/cron/jobs` als vangnet. Op Vercel Hobby mag een cron
  maar één keer per dag; op Pro zet je hem op elk kwartier.
- Beheer, Achtergrondwerk toont de stand per systeem met "vastgelopen" als er al een uur iets wacht
  zonder dat er iets gebeurt, en de knoppen "Verwerk wat klaarstaat" en "Mislukte taken opnieuw".

## Wat het project levert

De handlers, idempotent: eerst kijken of het al bestaat, dan pas aanmaken.

## Bewijs

`pnpm check:jobs` (sleutel, lease, pogingen, ronde, opruimen), e2e `06-jobs.spec.ts`, en
`pnpm task:jobs` voor een ronde vanaf je eigen machine.
