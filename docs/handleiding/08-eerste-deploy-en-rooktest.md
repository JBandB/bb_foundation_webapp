<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 08. De eerste deploy en de rooktest

**Wat het is.** De eerste keer dat de tool met database en inlog op productie staat, en de controle
die je na elke deploy doet. **Tijd:** een kwartier.

**Doe dit na** 06 en 07. **Daarna kun je** collega's uitnodigen en het bouwen beginnen.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Alle variabelen van de kern en je inlogmethode in Vercel (06) | De build draait `pnpm db:deploy` en de inlog moet werken | |
| `pnpm db:roundtrip` groen op `dev` (07) | Dezelfde migraties gaan nu naar productie | |
| Een rol voor jezelf (05 of 05b) | Anders kun je wel inloggen maar niets zien | |

## Stappen

1. Merge je branch met de uitvoer van de wizard en `template.lock.json` naar `main` via een pull
   request met groene CI.
   **Controle:** Vercel start een productiedeploy; in de build-log staat `pnpm db:deploy` met de
   migraties die hij draaide.
2. Open het productieadres. Het inlogscherm toont de versie uit `lib/version.ts` en "Nieuw in".
   **Controle:** de versie is die van je werkkopie.
3. Log in. Met Microsoft: via de knop; met wachtwoord: met het account uit 05b (maak het eerst met
   `pnpm invite` tegen de productiedatabase, eenmalig, vanaf je laptop met de productiestring in een
   apart `.env.production.local` dat je daarna weggooit, of via een eenmalige taak).
   **Controle:** de rail toont je naam, je rol en de versie; Beheer staat erin.
4. **Beheer, Systeem**: versie, omgeving `production`, databaseschema groen, koppelingen met hun
   stand.
   **Controle:** niets rood. Wat "uit" staat, is wat je nog niet hebt ingericht.
5. Vanaf je laptop, op de commit die je uitrolde: `pnpm smoke:prod`. Het script logt niet in, kent
   geen geheim en raakt geen rij; het kijkt als een onbekende bezoeker.
   **Controle:** groen: het inlogscherm geeft 200 met de versie, pagina's achter de sessie sturen door
   naar het inlogscherm, elke cronroute uit `vercel.json` geeft 404 zonder token, `robots.txt` en
   `security.txt` staan er, en de security headers staan.
6. Zet in **Settings, Cron Jobs** van Vercel of de crons uit `vercel.json` er staan.
   **Controle:** elke cron staat er met zijn rooster; op Hobby hoogstens dagelijks.

## Waarom zo

De build migreert de database waar hij op uitkomt, en daarom is de eerste deploy het moment waarop
alles bij elkaar komt: variabelen, migraties, inlog. De rooktest is er omdat een deploy kan slagen en
toch de verkeerde versie tonen (een cache, een oude build), en omdat je wilt weten dat wat achter de
sessie hoort ook dicht is.

## Beveiliging

- De rooktest controleert dat de cronroutes dicht zijn en de headers staan; dat is de buitenkant.
  De binnenkant bewijzen de checks en de e2e vóór de deploy, op `dev`.
- Een eenmalige verbindingsstring van productie op je laptop (voor `pnpm invite`) gooi je daarna weg.

## Kosten

Elke deploy is een bouwminuut bij Vercel en wekt de productiedatabase. Binnen het plan. Stand van
oktober 2026.

## Zo zie je dat het goed staat

- `pnpm smoke:prod` groen, Beheer, Systeem groen, en de versie in de rail is die van `main`.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| De build faalt op `pnpm db:deploy` | Een variabele ontbreekt (06) of een migratie faalt: de log zegt welke; test hem met `pnpm db:roundtrip` op `dev` |
| Het inlogscherm toont een oude versie | De deploy is nog bezig of je kijkt naar een cache; wacht en ververs zonder cache |
| Inloggen geeft een fout van Microsoft | De redirect-URI van productie ontbreekt (05) |
| `pnpm smoke:prod` zegt dat een cronroute 200 geeft zonder token | `CRON_SECRET` ontbreekt in Production, of de route mist `requireCron`; dat is een fout die je meteen oplost |
| Alles groen, maar een collega komt er niet in | Geen rol toegewezen (11) of niet uitgenodigd (05b) |

## Vul in

| Wat | Waarde |
|---|---|
| Datum van de eerste deploy | |
| Versie | |
| Uitslag rooktest | |
