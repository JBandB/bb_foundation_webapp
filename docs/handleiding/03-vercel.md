<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 03. Vercel

**Wat het is.** Vercel bouwt de tool bij elke push en zet hem online: een preview per pull request en
productie vanaf `main`. **Tijd:** een half uur.

**Doe dit na** 02. **Daarna kun je** de database aanmaken (04) en de variabelen zetten (06).

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Een Vercel-account op het adres van de organisatie, aangemeld via GitHub | Dan ziet Vercel de repo meteen | |
| Owner van de GitHub-organisatie | Vercel vraagt toegang tot de repo | |
| Een creditcard, pas bij Pro | Hobby is gratis en genoeg om te bouwen | later |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een team | de naam van je organisatie | nergens |
| Een project | de slug van je project | het adres `<slug>.vercel.app` komt in `project.config.json` als `productionUrl` zodra je het weet |

## Stappen

1. Ga naar vercel.com en kies **Continue with GitHub**. Maak via het menu linksboven een **Team** aan
   met de naam van je organisatie. Plan: **Hobby** zolang je bouwt.
   **Controle:** het team staat in het menu en jij bent Owner.
2. **Add New, Project**, kies de repo. Staat hij er niet: **Adjust GitHub App Permissions** en geef
   Vercel toegang tot precies die repo. Framework: Next.js (herkend). Root Directory leeg.
   Environment Variables: **nog niets**. Klik **Deploy**.
   **Controle:** de eerste deploy slaagt; de wortel van het template heeft nog geen database nodig.
3. **Settings, Functions**: Function Region op **Frankfurt (fra1)**. De database komt in Frankfurt
   en elke hop tussen regio's kost tijd op elke query.
   **Controle:** de regio staat op fra1; `vercel.json` in de repo zegt hetzelfde.
4. **Settings, Deployment Protection**: Vercel Authentication aan voor previews, zodat een
   preview-adres niet voor iedereen open staat.
   **Controle:** een preview-adres vraagt om in te loggen bij Vercel.
5. **Settings, Git**: Production Branch is `main`. Zet onder **Ignored Build Step** dat er geen
   preview wordt gebouwd zonder pull request (de optie "Only build production and pull requests"),
   zodat een losse push geen deploy en geen databasebranch kost.
   **Controle:** een push op een branch zonder pull request bouwt niets; een pull request wel.
   Elke ronde gaat zo via de vaste branch `release/next` en zijn preview; zie 09.
6. Noteer het adres onder **Domains** (`<slug>.vercel.app`). Wil je een eigen domein, koppel het dan
   nu: de redirect-URI van de inlog (05) moet erop matchen en dat achteraf wijzigen is een extra
   ronde.
   **Controle:** het adres toont het inlogscherm van het template.
7. Installeer de CLI op je machine en koppel de map: `npm i -g vercel`, `vercel login`, en in de
   map van de repo `vercel link` (kies het team en het project).
   **Controle:** `vercel env pull .env.local` schrijft een bestand (nog bijna leeg).

## Waarom zo

Een team in plaats van een persoonlijk account, om dezelfde reden als bij GitHub. Frankfurt, omdat de
data in de EU blijft en de database daar staat. Geen preview zonder pull request, omdat elke preview
een bouwminuut en een databasebranch kost en een losse push niets oplevert wat een pull request niet
ook geeft.

## Beveiliging

- De variabelen staan alleen hier (06). Zet **Sensitive** aan bij elk geheim: daarna is de waarde niet
  meer terug te lezen, alleen te vervangen.
- Deployment Protection houdt previews dicht. Productie is openbaar tot aan het inlogscherm; dat is
  de bedoeling, en `pnpm smoke:prod` controleert dat alles erachter dicht is.
- De tool zet security headers (CSP, nosniff, geen framing) in `lib/config/next-base.ts`; je hoeft
  daar niets voor te doen.

## Kosten

Plan: **Hobby** tijdens het bouwen, gratis. **Pro** zodra er echte gebruikers zijn: het Hobby-plan
staat commercieel gebruik niet toe, en een cron draait er maar één keer per dag. Plafond: op Pro
staat **Spend Management** aan met een hard bedrag; op Hobby is er niets te overschrijden. Uit je
checklist: het deel voor Vercel, met de seat per bouwer erbij op Pro. Upgraden is pas nodig bij de
livegang met gebruikers, of eerder als een cron vaker dan dagelijks moet. Stand van oktober 2026;
controleer het Hobby-beleid als je twijfelt.

## Zo zie je dat het goed staat

- Een pull request krijgt binnen een paar minuten een preview-adres en een groene check. Vanaf
  `release/next` is dat altijd hetzelfde adres (09).
- Een merge naar `main` zet een nieuwe deploy op productie, en het inlogscherm toont de nieuwe versie.
- **Settings, Functions** zegt fra1; **Settings, Cron Jobs** toont de crons uit `vercel.json`.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| De deploy faalt met een melding over `DATABASE_URL` | De build draait `pnpm db:deploy`; zonder database (04) en variabelen (06) kan dat niet. Volg eerst 04 en 06 |
| Een preview komt uit op productie-data | De Neon-integratie maakte geen branch (geen pull request) en `PRODUCTION_DB_ENDPOINT` staat niet; zie 04 |
| Een gewijzigde variabele doet niets | Een variabele geldt pas na een nieuwe deploy: **Deployments, Redeploy** |
| "Hobby plan does not allow cron jobs more frequent than daily" | Een rooster in `vercel.json` staat vaker dan dagelijks; zet het op dagelijks of ga naar Pro |

## Vul in

| Wat | Waarde |
|---|---|
| Team | |
| Project | |
| Productieadres | |
| Plan en plafond | |
| Datum aangemaakt | |
