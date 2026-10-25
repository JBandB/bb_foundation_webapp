<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 04. Neon

**Wat het is.** Neon is de Postgres-database: één productiebranch, een dev-branch om op te werken,
en een wegwerpbranch per pull request. **Tijd:** een half uur.

**Doe dit na** 03. **Daarna kun je** de variabelen zetten (06) en lokaal werken (07).

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Het Vercel-team uit 03 | De Marketplace koppelt de database aan het project | |
| Een Neon-account op het adres van de organisatie | Ontstaat via de Marketplace, of los op neon.tech | |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een database (project) in Frankfurt | de slug van je project | `DATABASE_URL` en `DATABASE_URL_UNPOOLED` in Vercel, per omgeving (06) |
| Een branch `dev` | `dev` | de Development-waarden in Vercel, dus `.env.local` |
| Het endpoint-id van productie | ziet eruit als `ep-woord-woord-a1b2c3d4` | `PRODUCTION_DB_ENDPOINT` in Vercel; `SEED_TARGET` lokaal krijgt het id van `dev` |

## Stappen

1. In het Vercel-team: **Storage, Create Database, Neon**. Regio **Frankfurt (eu-central-1)**, het
   gratis plan, naam de slug van je project. Koppel aan het project voor **alle drie** de omgevingen.
   **Controle:** onder Settings, Environment Variables staan nu `DATABASE_URL` en de ongepoolde
   variant, beheerd door de integratie.
2. Open de Neon-console (knop in Vercel). **Branches, Create branch**: naam `dev`, parent de
   productiebranch.
   **Controle:** `dev` staat in de lijst met een eigen compute.
3. In de instellingen van de Vercel-integratie in Neon: **per preview-deployment een branch**
   aanmaken aan, **auto-delete** zodra de pull request sluit, en **Automatically delete obsolete
   branches** aan: verdwijnt de Git-branch, dan verdwijnt de databasebranch ook.
   **Controle:** de eerstvolgende pull request krijgt een branch `preview/<branch>` in Neon. Met de
   werkwijze uit 09 is dat `preview/release/next`, elke ronde vers gekopieerd van productie.
4. Zet op het project **autosuspend** op de kortste tijd die het plan toestaat, het **minimum
   compute** op de laagste stand, en **history retention** op een dag (of wat je echt nodig hebt).
   **Controle:** de compute van `dev` slaapt een paar minuten na je laatste query.
5. Kopieer van `dev` (**Connect**) de **pooled** verbindingsstring (hostnaam met `-pooler`) en de
   **direct** string (zonder). Die gaan in 06 naar de Development-omgeving van Vercel. Noteer van de
   productiebranch het **endpoint-id** (geen wachtwoord, geen string): dat wordt
   `PRODUCTION_DB_ENDPOINT` in Vercel voor Production en Preview.
   **Controle:** beide strings eindigen op `?sslmode=require`; het endpoint-id begint met `ep-`.
6. Voer op `dev` in de SQL Editor uit: `select version();`. De eerste migraties (de baseline van het
   template) draaien bij de eerste deploy en lokaal met `pnpm db:migrate`.
   **Controle:** `pnpm db:status` (na 07) zegt dat de twee baseline-migraties staan en noemt `dev`
   als wegwerpbranch.

## Waarom zo

Lokaal werk je nooit tegen productiedata: daarom `dev`. Een pull request krijgt een eigen kopie van
het schema zodat een migratie heen en terug getest is voordat hij `main` haalt: daarom de branch per
preview. En omdat een console-instelling een keer misgaat, controleert `pnpm db:deploy` zelf of een
preview niet op het productie-endpoint uitkomt; daarvoor moet hij weten welk id dat is.

Geen lokale Postgres: Neon heeft `btree_gist` en de extensies die de patronen van het template
gebruiken, en een lokale installatie zonder die extensies laat constraints stil weg.

## Beveiliging

- De verbindingsstrings zijn geheimen: alleen in Vercel (Sensitive) en in `.env.local`.
- `pnpm db:seed` schrijft alleen op de branch uit `SEED_TARGET` en weigert op Vercel en op het
  productie-endpoint.
- Point-in-time restore: weet hoe lang je terug kunt (history retention) en waar de knop zit.

## Kosten

Plan: **Free** tot het niet meer past (compute-uren en opslag staan in de console). Plafond: het
plan zelf; op Launch een harde limiet via de instellingen van het project. Uit je checklist: het deel
voor Neon. Wat de rekening maakt: compute die wakker blijft (crons die vaak langskomen, een dev-branch
die de hele dag draait) en veel schrijfvolume. Upgraden is nodig als de gratis compute-uren op zijn
of als je meer branches wilt. Stand van oktober 2026.

## Zo zie je dat het goed staat

- `pnpm db:status` lokaal: de migraties staan, de branch is `dev`.
- Een pull request toont in Neon een branch `preview/...` die verdwijnt als de pull request sluit.
- Beheer, Systeem in de tool: "Databaseschema" is groen.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| `pnpm db:migrate` faalt op SSL of een time-out | De direct string ontbreekt of is de pooled string; migraties gaan over `DATABASE_URL_UNPOOLED` |
| Een preview-deploy faalt met een melding over `PRODUCTION_DB_ENDPOINT` | Met opzet: zet het id in Vercel voor Production en Preview, zie 06 |
| "relation does not exist" na een deploy | De migratie is niet gedraaid: kijk in de build-log naar `pnpm db:deploy` |
| De rekening loopt op | Compute slaapt niet: autosuspend korter, crons minder vaak, branches opruimen |

## Vul in

| Wat | Waarde |
|---|---|
| Neon-project | |
| Productiebranch en endpoint-id | |
| Dev-branch en endpoint-id | |
| Plan, autosuspend, retention | |
| Datum aangemaakt | |
