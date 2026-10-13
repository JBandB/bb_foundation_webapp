## Module messaging: mail en meldingen

- **Een bericht aan een mens gaat via `enqueueKind`** in `lib/messaging/enqueue-kind.ts`, met een
  soort uit de catalogus (`lib/messaging/kinds.ts` plus `lib/messaging/catalogue.ts` van het project).
  De instellingen van de beheerder bepalen of de soort aan staat, naar wie hij gaat en met welke
  drempel; de code bepaalt dat nooit zelf. Nooit rechtstreeks mailen vanuit een handeling.
- **De idempotentiesleutel is soort plus onderwerp plus ontvanger**, bijvoorbeeld
  `shift_unfilled:<shiftId>:<adres>`. Een dag erbij als het morgen weer mag. Nooit een tijdstip.
- **Tekst van buiten als citaat** (`quoteUntrusted`), zodat een koppeling van een vreemde nooit een
  knop wordt in onze mail. Eén https-koppeling alleen op een regel wordt wel een knop: dat is de
  manier om "open dit" te zeggen.
- **Het transport komt uit `project.config.json`** (`messaging.transport`: smtp of graph) en wordt
  gelezen in `lib/messaging/transport/index.ts`. Geen tweede plek die een mail verstuurt. Teams gaat
  via een webhook, alleen als `messaging.teams` aan staat.
- **Na het inzetten `kickOutbox()`** in de server action; de cron `/api/cron/outbox` is het vangnet
  en meldt werk dat stilstaat (soort `integration_stuck`, één keer per dag). Mislukt een bericht drie
  keer, dan blijft het op mislukt staan tot iemand het op Beheer, Berichten opnieuw aanbiedt.
- **De doelgroepen zijn adressering, geen autorisatie**: `admins`, `person` of `role:<rol>`. Wie een
  bericht krijgt, mag daarmee nog niets.
- **Bewijs:** `pnpm check:messaging` (sleutel, bundeling, instellingen, ontvangers, vastloopmelding),
  `pnpm mail:test <adres>` voor één proefmail langs het echte transport, e2e `07-messages.spec.ts`.
