<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Checklist: accounts, toegang en kosten

Een wizard kan van dit stramien een persoonlijke versie maken (`00-checklist-<slug>.md`), met de
namen ingevuld en alleen de onderdelen die voor jouw project gelden. Dit is het volledige stramien. Vink
af wat gedaan is; vul de twee tabellen onderaan in en houd ze bij. Geen geheimen in dit bestand: het
staat in git.

## Voordat je begint

- [ ] Je weet wie de eigenaar van het project is (één persoon beslist).
- [ ] Je weet of er een Microsoft 365-tenant is waar een beheerder een app mag registreren. Ja: de
      inlog gaat via Microsoft (handleiding 05). Nee: eigen accounts met wachtwoord (handleiding 05b).
- [ ] Je hebt een budget per maand afgesproken en weet bij welke dienst het plafond staat
      (handleiding 30).

## Deel 1. Voorbereiding

Vooraf en thuis, ongeveer een uur, in deze volgorde (handleiding 01).

- [ ] 1. Accounts aanmaken: GitHub, Vercel met GitHub als login, Claude met een abonnement dat
      Claude Code bevat. Overal tweestapsverificatie en het plafond per dienst. Neon komt later via
      Vercel.
- [ ] 2. Installeren: Git, Node.js 24, VS Code, Claude Code, pnpm.
- [ ] 3. Git instellen: naam en e-mail.
- [ ] 4. Een werkmap buiten OneDrive.
- [ ] 5. Controleren: `git --version`, `node -v` (begint met `v24`), `pnpm -v` en `claude --version`
      geven elk een versie.
- [ ] 6. Een eerste versie van je projectplan: minstens kopje 1, 2, 3 en 8 (handleiding 10).
- [ ] 7. Klaar: laptop, telefoon met authenticator, inloggegevens, je projectplan.

## Deel 2. Klaarzetten en live (handleiding 01)

Eerst ontwerp je je tool: het projectplan en de keuzes voor `project.config.json` (handleiding 10).
Dan deze acht stappen.

- [ ] 1. GitHub: Use this template, privérepo (handleiding 02).
- [ ] 2. VS Code: Clone Repository, in de werkmap uit de voorbereiding, niet in OneDrive.
- [ ] 3. De startprompt in het Claude-paneel, uit een wizard of uit handleiding 10. Commit en Sync wat
      Claude neerzet, en zeg "gedaan".
- [ ] 4. Vercel: Add New Project, Neon onder Storage (handleiding 03 en 04).
- [ ] 5. De variabelen die Claude noemt, in Vercel: namen van Claude, waarden alleen van jou (handleiding 06).
- [ ] 6. Commit en Sync: je tool gaat online (handleiding 08).
- [ ] 7. Je eerste account en tweestapsverificatie (handleiding 05b, stap 1 tot 3; met Microsoft handleiding 05).
- [ ] 8. Vanaf nu: werken via `release/next` (handleiding 09).

## Deel 3. Daarna, per dienst afmaken

### GitHub (handleiding 02)

- [ ] Een organisatie, geen persoonlijk account: een persoonlijk account is niet overdraagbaar.
- [ ] Tweestapsverificatie verplicht voor alle leden van de organisatie.
- [ ] Dependabot alerts, Dependabot security updates en secret scanning aan (Settings, Code
      security), en Automatically delete head branches aan (Settings, General).
- [ ] Actions: workflow permissions op alleen-lezen; de uitgavenlimiet voor Actions op nul.
- [ ] Het gratis plan heeft geen branch protection op een privé-repo: de CI is advies. Werk daarom
      altijd via een pull request (werkwijze, sectie 10). Wil je het slot, dan is dat GitHub Team.
- [ ] Zodra er echte gebruikers zijn niet meer rechtstreeks op `main`: wijzigingen gaan via de
      releasebranch `release/next` (handleiding 09).

### Vercel (handleiding 03)

- [ ] Een team, geen persoonlijk account.
- [ ] Functieregio Frankfurt (eu-central-1), bij de database.
- [ ] Hobby tijdens het bouwen; Pro met Spend Management zodra er echte gebruikers zijn (het
      Hobby-plan staat commercieel gebruik niet toe en een cron draait er maar één keer per dag).
- [ ] Deployment Protection aan voor previews.
- [ ] De variabelen gezet (handleiding 06), met Sensitive aan bij elk geheim.

### Neon (handleiding 04)

- [ ] Een project in Frankfurt, gratis plan tot het niet meer past.
- [ ] Een dev-branch naast de productiebranch; preview-branches per pull request aan.
- [ ] `PRODUCTION_DB_ENDPOINT` in Vercel, zodat een preview nooit op productie migreert.
- [ ] Scale to zero en autosuspend op de kortste tijd; history retention op wat je nodig hebt.
- [ ] Je weet waar het herstelpunt (PITR) staat en hoe lang het terugkijkt.

### Inloggen

**Met Microsoft (handleiding 05 en 11)**

- [ ] De app-registratie met de redirect-URI's van lokaal en productie.
- [ ] De app roles met exact de waarden uit `project.config.json`.
- [ ] "Assignment required" op Yes, en de rollen toegewezen aan de eerste mensen.
- [ ] De vervaldatum van het client secret in de tabel hieronder, met een herinnering een maand ervoor.

**Met wachtwoord (handleiding 05b)**

- [ ] De eerste beheerder uitgenodigd met `pnpm invite` en tweestapsverificatie ingesteld.
- [ ] Afgesproken wie een account mag uitnodigen en wie bij een vermoeden van misbruik ingrijpt.

### Mail en meldingen, alleen als de module messaging aan staat

- [ ] Transport gekozen: Graph (handleiding 20, een gedeelde postbus met `Mail.Send` en een
      ApplicationAccessPolicy) of SMTP (handleiding 20b, een aanbieder met SPF en DKIM op het domein).
- [ ] Eén proefmail verstuurd met `pnpm mail:test`.
- [ ] Teams, alleen als het aan staat: de webhook van het kanaal, getest met `pnpm teams:test`
      (handleiding 21).

### Bestanden, alleen als de module files aan staat (handleiding 22)

- [ ] Een storage account in een EU-regio, een privécontainer, een SAS-token met Read, Create en
      Write en een vervaldatum van hoogstens een jaar.
- [ ] De vervaldatum in `BLOB_SAS_EXPIRES` én in de tabel hieronder.
- [ ] Een bewaarbeleid op de container als de bestanden onder een bewaarplicht vallen.

### AI, alleen als de module ai aan staat (handleiding 24)

- [ ] Kopje 10 van het projectplan zegt per prompt wat er naar Claude gaat en wat niet.
- [ ] Een workspace voor deze tool in de Claude Console, met een uitgavenlimiet per maand en
      automatisch bijkopen uit.
- [ ] Een sleutel voor Vercel (Production en Preview, Sensitive) en een eigen sleutel in
      `.env.local`; `pnpm ai:test -- <model>` zegt "Structuur: klopt".
- [ ] Onder Beheer, AI de prijzen per model ingevuld, met de datum bij "Vul in" in handleiding 24.

### Lokaal werken (handleiding 07)

- [ ] `vercel env pull .env.local`, `AUTH_DEV_LOGIN=1` erbij, `pnpm install`, `pnpm db:status`.
- [ ] `DATABASE_URL` in `.env.local` wijst naar de branch `dev`, niet naar productie; `SEED_TARGET`
      is het endpoint-id van `dev` en `pnpm db:status` noemt `dev`.
- [ ] `.env.local` staat niet in `git status`.

### Werken met een releasebranch (handleiding 09)

- [ ] Elke ronde begint op een verse `main` met de branch `release/next`.
- [ ] Het vaste previewadres van `release/next` staat bij "Vul in" in handleiding 09; bij inloggen
      met Microsoft ook als redirect-URI.
- [ ] Een wijziging wordt op die preview getest en gaat daarna via een pull request naar `main`.

### Eerste deploy en rooktest (handleiding 08)

- [ ] De deploy naar productie slaagt en `pnpm smoke:prod` is groen.
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
| Claude API | tegoed vooraf, automatisch bijkopen uit | de uitgavenlimiet op de workspace | |
