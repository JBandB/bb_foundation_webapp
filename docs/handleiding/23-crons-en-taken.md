<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 23. Crons en taken

**Wat het is.** Werk dat vanzelf gebeurt: opruimen, de wachtrij verwerken, mail versturen, een
melding als iets stilstaat. Elke cron is een route die Vercel op een vast moment aanroept met een
geheim, en dezelfde code als een `pnpm task:<naam>` die je zelf kunt draaien. **Tijd:** een kwartier
om te begrijpen; inrichten is één variabele.

**Doe dit na** 06. **Daarna kun je** op Beheer, Systeem en Beheer, Achtergrondwerk zien dat het loopt.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| `CRON_SECRET` in Vercel, alleen Production (06) | Zonder weigert elke cronroute | |
| De crons in `vercel.json` (komen uit het manifest van het template) | Vercel leest ze bij de deploy | |

## Wat er loopt

| Cron | Module | Rooster (UTC) | Wat |
|---|---|---|---|
| `/api/cron/prune` | kern | dagelijks 03:30 | oude rijen weg (rate limits, en wat het project toevoegt) |
| `/api/cron/jobs` | jobs | dagelijks 03:45 | de wachtrij verwerken en afgehandeld werk opruimen |
| `/api/cron/outbox` | messaging | dagelijks 03:50 | mail versturen, de vastloopmelding, opruimen |

De roosters staan in UTC: 03:30 UTC is 05:30 in de zomer en 04:30 in de winter.

## Stappen

1. Controleer na een deploy in Vercel onder **Settings, Cron Jobs** dat elke cron uit `vercel.json`
   er staat.
   **Controle:** de lijst klopt met de tabel hierboven plus wat het project toevoegde.
2. Kijk een dag later onder **Logs** of de crons liepen (status 200).
   **Controle:** per cron een regel met 200; een 404 betekent dat `CRON_SECRET` niet klopt.
3. Wil je een ronde nu: `pnpm task:prune`, `pnpm task:jobs`, `pnpm task:outbox` vanaf je machine,
   tegen de database in `.env.local`. Of de knoppen op Beheer, Achtergrondwerk en Beheer, Berichten.
   **Controle:** het script drukt een telling af.
4. Op Vercel Pro mag een cron vaker: zet dan in `vercel.json` het rooster van `/api/cron/jobs` en
   `/api/cron/outbox` op `*/15 * * * *`, en zet die paden in `template.keepCrons` in
   `project.config.json`, zodat een update van het template het rooster niet terugzet.
   **Controle:** `pnpm template:apply` meldt dat het pad het rooster van het project houdt.

## Waarom zo

Op Vercel Hobby mag een cron hoogstens één keer per dag. Daarom gebeurt het echte werk direct na de
handeling die het veroorzaakte (de ronde na het antwoord, `kickJobs` en `kickOutbox`) en is de cron
het vangnet voor wat daar misging. Op Pro mag het vaker en wordt het vangnet een kwartier.

Een cron die over zijn tijd gaat wordt stil afgekapt; elke route zet daarom `maxDuration` op 60 en
werkt in rondes van beperkte grootte.

## Beveiliging

- Zonder het juiste token geeft elke cronroute een 404, alsof hij niet bestaat; `pnpm smoke:prod`
  controleert dat.
- `CRON_SECRET` staat alleen in Production; previews draaien geen crons.
- Een taak vanaf je machine werkt op de database in `.env.local`: de dev-branch, tenzij je bewust
  iets anders inlaadt.

## Kosten

Cronaanroepen tellen als functieaanroepen en vallen binnen de bundel. Wat telt: een cron die vaak
langskomt houdt de database wakker (04). Stand van oktober 2026.

## Zo zie je dat het goed staat

- Vercel, Logs: elke cron 200 op zijn tijd.
- Beheer, Achtergrondwerk en Beheer, Berichten: niets "vastgelopen".

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| 404 in de logs van een cron | `CRON_SECRET` ontbreekt of wijkt af in Production |
| 500 "CRON_SECRET is niet ingesteld" | De variabele ontbreekt helemaal |
| De cron liep, maar de rij groeit | De ronde haalt het werk niet binnen de tijd; op Pro vaker draaien, of kijk naar wat er mislukt op Beheer |
| "vastgelopen" op Beheer | Er wacht al een uur werk zonder dat er iets gebeurt; meestal een variabele of een token |
| Deploy weigert op Hobby | Een rooster vaker dan dagelijks; zet het terug of ga naar Pro |

## Vul in

| Wat | Waarde |
|---|---|
| Plan en dus het rooster van de wachtrij | |
| Wie kijkt in de logs als iets stilstaat | |
