<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 07. Lokaal werken

**Wat het is.** De tool op je eigen machine, tegen de dev-branch van Neon, met een dev-login zodat je
snel van rol kunt wisselen zonder Microsoft. Dit is waar Claude Code bouwt en test. **Tijd:** een
half uur de eerste keer.

**Doe dit na** 06. **Daarna kun je** bouwen, de checks en de e2e draaien, en de eerste deploy doen (08).

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Node 24 en pnpm (de versie uit `package.json`, `packageManager`) | De toolchain | |
| Git en de Vercel CLI (`npm i -g vercel`) | Code ophalen en variabelen ophalen | |
| Claude Code | Bouwt met je mee | |
| Een gekoppelde map (`vercel link`, uit 03) | `vercel env pull` weet dan welk project | |

## Stappen

1. Kloon de repo en open de map. Draai `pnpm install`.
   **Controle:** geen fouten; `node_modules` bestaat.
2. `vercel env pull .env.local`. Voeg met de hand drie regels toe: `APP_ENV=local`, `AUTH_DEV_LOGIN=1`
   en `SEED_TARGET=<endpoint-id van de dev-branch>`. Elke `vercel env pull` overschrijft het bestand:
   zet ze er daarna weer in.
   **Controle:** `git status` toont `.env.local` **niet**; hij staat in `.gitignore`.
3. `pnpm template:apply` als je dat nog niet deed na de startprompt, en volg de slottekst.
   **Controle:** "template.lock.json geschreven" en een lijst met wat je nu doet. Daarna
   `pnpm doctor`: Node, git, het template, `.env.local` en de database tegen `SEED_TARGET`, zonder
   iets aan te raken. Geen regel op ACTIE.
4. `pnpm db:status`. De regel over de wegwerpbranch moet verschijnen en de branch moet `dev` zijn.
   Daarna `pnpm db:migrate` (de baseline en wat de modules genereerden), `pnpm db:bootstrap` (de
   organisatie) en `pnpm db:seed` (de dev-accounts).
   **Controle:** `pnpm db:status` noemt alle migraties; de seed zegt wat hij aanmaakte en is
   idempotent (een tweede keer verandert niets).
5. `pnpm setup:hooks` voor de commit-hook die een em-dash weigert, en `pnpm dev`. Open
   http://localhost:3000. Onderaan het inlogscherm staat de dev-login: kies een dev-account en
   eventueel andere rollen.
   **Controle:** na inloggen zie je de rail met de versie linksonder en, als beheerder, Beheer.
6. De batterij: `pnpm typecheck && pnpm lint && pnpm test && pnpm check:contrast && pnpm template:verify`,
   dan `pnpm db:roundtrip` (migraties heen en terug), de checks `pnpm check:core` (en per module),
   en de e2e `pnpm e2e:all` (bouwt en test tegen `next start` op poort 3100).
   **Controle:** alles groen. Dit is wat Claude ook draait; wat een database nodig heeft draai jij
   als Claude dat vraagt.

## Waarom zo

Lokaal werken tegen een echte Neon-branch en niet tegen een lokale Postgres: de extensies en het
gedrag zijn dan gelijk aan productie, en een migratie die lokaal werkt, werkt ook daar. De dev-login
bestaat alleen als `AUTH_DEV_LOGIN=1` staat én `APP_ENV=local`, en weigert in elke andere omgeving te
laden, dus hij kan nooit in een deploy terechtkomen, ook niet buiten Vercel. `SEED_TARGET` zorgt dat `pnpm db:seed` alleen schrijft waar je het bedoelt.

## Beveiliging

- `.env.local` bevat geheimen. Nooit committen, nooit delen, nooit in de chat.
- De dev-accounts (`<rol>@dev.invalid`) bestaan alleen op `dev`; op productie worden ze niet
  aangemaakt.
- Wie de machine deelt, deelt de sessie: log uit als je weggaat.

## Kosten

De dev-branch van Neon heeft een eigen compute die wakker is terwijl je werkt en daarna slaapt
(autosuspend, 04). Geen Vercel-kosten voor lokaal werken. Stand van oktober 2026.

## Zo zie je dat het goed staat

- `pnpm dev` start zonder rode regels en het inlogscherm toont de versie uit `lib/version.ts`.
- `pnpm db:status` zegt dat de database gelijk loopt met de code.
- Beheer, Systeem zegt bij Omgeving "lokaal".

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| Je weet niet waar het zit | `pnpm doctor` zegt per onderdeel wat niet klopt en wat je doet |
| `tsx ontbreekt` | `pnpm install` nog niet gedraaid in deze map |
| `DATABASE_URL_UNPOOLED ontbreekt` | `.env.local` is er niet of mist de Development-waarden; `vercel env pull .env.local` opnieuw |
| De dev-login staat er niet | `AUTH_DEV_LOGIN=1` ontbreekt in `.env.local`, of je kijkt naar een deploy |
| De app start niet: "AUTH_DEV_LOGIN staat aan, maar APP_ENV is niet local" | `APP_ENV=local` ontbreekt, meestal na `vercel env pull`; zet hem terug in `.env.local` |
| `pnpm db:seed` weigert | `SEED_TARGET` ontbreekt of wijst naar een andere branch dan `DATABASE_URL`; dat is de bedoeling |
| Een pnpm-script faalt met "is not recognized" en een half pad | Een `&` in de gebruikersnaam van Windows breekt geneste `pnpm`; de scripts van het template roepen daarom `node` rechtstreeks aan. Schrijf eigen scripts net zo |
| `next build` faalt op een ontbrekende BUILD_ID | `next build` is gestart met een `--env-file`-vlag; de scripts doen dat bewust niet |

## Vul in

| Wat | Waarde |
|---|---|
| Node- en pnpm-versie | |
| Endpoint-id van `dev` (`SEED_TARGET`) | |
| Datum ingericht | |
