<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Checklist: accounts, toegang en kosten

De wizard maakt van dit stramien een persoonlijke versie (`00-checklist-<slug>.md`) met de namen
ingevuld en alleen de onderdelen die voor jouw project gelden. Dit is het volledige stramien. Vink
af wat gedaan is; vul de twee tabellen onderaan in en houd ze bij. Geen geheimen in dit bestand: het
staat in git.

## Voordat je begint

- [ ] Je weet wie de eigenaar van het project is (één persoon beslist).
- [ ] Je weet of er een Microsoft 365-tenant is waar een beheerder een app mag registreren. Ja: de
      inlog gaat via Microsoft (handleiding 05). Nee: eigen accounts met wachtwoord (handleiding 05b).
- [ ] Je hebt een budget per maand afgesproken en weet bij welke dienst het plafond staat
      (handleiding 30).

## GitHub (handleiding 02)

- [ ] Een organisatie, geen persoonlijk account: een persoonlijk account is niet overdraagbaar.
- [ ] Tweestapsverificatie verplicht voor alle leden van de organisatie.
- [ ] De repo aangemaakt uit het template, **privé**.
- [ ] Dependabot alerts en secret scanning aan (Settings, Code security).
- [ ] Actions: workflow permissions op alleen-lezen; de uitgavenlimiet voor Actions op nul.
- [ ] Het gratis plan heeft geen branch protection op een privé-repo: de CI is advies. Werk daarom
      altijd via een pull request (werkwijze, sectie 10). Wil je het slot, dan is dat GitHub Team.

## Vercel (handleiding 03)

- [ ] Een team, geen persoonlijk account; het project geïmporteerd uit de repo.
- [ ] Functieregio Frankfurt (eu-central-1), bij de database.
- [ ] Hobby tijdens het bouwen; Pro met Spend Management zodra er echte gebruikers zijn (het
      Hobby-plan staat commercieel gebruik niet toe en een cron draait er maar één keer per dag).
- [ ] Deployment Protection aan voor previews.
- [ ] De variabelen gezet (handleiding 06), met Sensitive aan bij elk geheim.

## Neon (handleiding 04)

- [ ] Een project in Frankfurt, gratis plan tot het niet meer past.
- [ ] Een dev-branch naast de productiebranch; preview-branches per pull request aan.
- [ ] `PRODUCTION_DB_ENDPOINT` in Vercel, zodat een preview nooit op productie migreert.
- [ ] Scale to zero en autosuspend op de kortste tijd; history retention op wat je nodig hebt.
- [ ] Je weet waar het herstelpunt (PITR) staat en hoe lang het terugkijkt.

## Inloggen

**Met Microsoft (handleiding 05 en 11)**

- [ ] De app-registratie met de redirect-URI's van lokaal en productie.
- [ ] De app roles met exact de waarden uit `project.config.json`.
- [ ] "Assignment required" op Yes, en de rollen toegewezen aan de eerste mensen.
- [ ] De vervaldatum van het client secret in de tabel hieronder, met een herinnering een maand ervoor.

**Met wachtwoord (handleiding 05b)**

- [ ] De eerste beheerder uitgenodigd met `pnpm invite` en tweestapsverificatie ingesteld.
- [ ] Afgesproken wie een account mag uitnodigen en wie bij een vermoeden van misbruik ingrijpt.

## Mail en meldingen, alleen als de module messaging aan staat

- [ ] Transport gekozen: Graph (handleiding 20, een gedeelde postbus met `Mail.Send` en een
      ApplicationAccessPolicy) of SMTP (handleiding 20b, een aanbieder met SPF en DKIM op het domein).
- [ ] Eén proefmail verstuurd met `pnpm mail:test`.
- [ ] Teams, alleen als het aan staat: de webhook van het kanaal, getest met `pnpm teams:test`
      (handleiding 21).

## Bestanden, alleen als de module files aan staat (handleiding 22)

- [ ] Een storage account in een EU-regio, een privécontainer, een SAS-token met Read, Create en
      Write en een vervaldatum van hoogstens een jaar.
- [ ] De vervaldatum in `BLOB_SAS_EXPIRES` én in de tabel hieronder.
- [ ] Een bewaarbeleid op de container als de bestanden onder een bewaarplicht vallen.

## Lokaal werken (handleiding 07)

- [ ] `vercel env pull .env.local`, `AUTH_DEV_LOGIN=1` erbij, `pnpm install`, `pnpm db:status`.
- [ ] `.env.local` staat niet in `git status`.

## Eerste deploy en rooktest (handleiding 08)

- [ ] De eerste deploy naar productie slaagt en `pnpm smoke:prod` is groen.
- [ ] Je kunt inloggen en ziet de versie linksonder in de rail.

## Terugkerende controles

- [ ] **Wekelijks**: Beheer, Systeem is groen.
- [ ] **Maandelijks**: de kosten per dienst tegen het plafond; de tabel Vervaldata nagelopen.
- [ ] **Jaarlijks**: `public/.well-known/security.txt` en de lijst met accounts nagelopen.

## Vervaldata

| Wat | Waar | Verloopt op | Herinnering gezet |
|---|---|---|---|
| Client secret van de app-registratie | Entra | | |
| SAS-token van de bestandsopslag | Azure | | |
| Wachtwoord of app-wachtwoord van de mailaanbieder | | | |

## Budget

| Dienst | Plan | Waar het plafond staat | Deel van het budget |
|---|---|---|---|
| GitHub | gratis, organisatie | Actions-uitgavenlimiet op nul | |
| Vercel | Hobby, later Pro | Spend Management | |
| Neon | gratis, later Launch | het plan zelf, autosuspend | |
| Azure (opslag) | pay as you go | een budgetwaarschuwing op de resource group | |
| Mailaanbieder | | | |
