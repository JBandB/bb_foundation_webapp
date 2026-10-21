<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 01. Start hier

**Wat het is.** De volgorde waarin je een nieuw project uit dit template in de lucht brengt: van een
lege repo tot een adres waar je collega's kunnen inloggen. Elke stap heeft een eigen handleiding die
klik voor klik gaat. **Tijd:** een uur voorbereiding, daarna een uur voor klaarzetten en live. Het
afmaken (inloggen, lokaal werken, de instellingen per dienst) is een dagdeel, verspreid over een paar
dagen als je op anderen moet wachten (een beheerder van de tenant, een creditcard voor Vercel).

Je hoeft geen ontwikkelaar te zijn. Je hoeft wel precies te doen wat er staat, en te stoppen bij een
stap waar je de rechten niet hebt: half ingericht is erger dan wachten.

## De volgorde

De route heeft drie delen. Ze heten overal hetzelfde: hier, in de checklist (`00-checklist.md`) en in
de wizard (`wizard/index.html`), die alle drie de delen op één pagina zet, met per stap een vinkje.
Op GitHub Pages: https://jbandb.github.io/bb_foundation_webapp/wizard/.

### Deel 1. Voorbereiding, vooraf en thuis

Open de wizard, deel A (`wizard/index.html#voorbereiden`). Die loopt de zeven stappen met je door, met
per stap een vinkje, en onthoudt in je browser hoe ver je bent. De oude link `wizard/voorbereiding.html`
stuurt daarheen door.

| Stap | Wat | Waar |
|---|---|---|
| 1 | Accounts aanmaken: GitHub, Vercel met GitHub als login, Claude met een abonnement dat Claude Code bevat. Neon komt later via Vercel | wizard, deel A, stap 1; 02, 03 en 30 voor het plafond per dienst |
| 2 | Installeren: Git, Node.js, VS Code, Claude Code, pnpm | deel A, stap 2 |
| 3 | Git instellen: naam en e-mail | deel A, stap 3 |
| 4 | Een werkmap buiten OneDrive | deel A, stap 4 |
| 5 | Het controlescript draaien | deel A, stap 5; `wizard/controle-laptop.md` |
| 6 | Je halve pagina schrijven: de zes vragen, die meteen in deel B staan | deel A, stap 6; 10 voor de uitleg |
| 7 | Klaar: wat je meeneemt | deel A, stap 7 |

### Deel 2. Klaarzetten en live

Eerst ontwerp je je tool in de wizard, deel B (handleiding 10). Je halve pagina staat daar al in. Deel B
levert één ding op: de startprompt, met `project.config.json`, het projectplan en je persoonlijke
checklist erin. Daarna deze acht stappen, ook in de wizard als deel C. Aan het eind staat de lege tool
online, en elke ronde daarna gaat via `release/next`.

| Stap | Wat | Handleiding | Wat je daarna hebt |
|---|---|---|---|
| 1 | GitHub: Use this template, privérepo | 02, stap 3 | je eigen repo, privé |
| 2 | VS Code: Clone Repository | 07, stap 1 | de repo in je werkmap |
| 3 | Plak de startprompt in het Claude-paneel: Claude zet config, plan en checklist neer en stopt. Commit en Sync, zeg "gedaan" | `wizard/README.md`; 10, "Wat Claude ermee doet" | de drie bestanden staan op GitHub; Claude past het template toe en schrijft de eerste specificatie |
| 4 | Vercel: Add New Project, Neon onder Storage | 03, 04 | een project dat bij elke push bouwt, met een database in Frankfurt |
| 5 | Zet de variabelen die Claude noemt in Vercel: namen van Claude, waarden alleen van jou | 06 | de geheimen op hun plek, nergens anders |
| 6 | Commit en Sync: je tool gaat online | 08 | de tool staat live |
| 7 | Maak je eerste account aan en stel tweestapsverificatie in | 05b, stap 1 tot 3 (met Microsoft: 05) | jij bent de eerste beheerder |
| 8 | Vanaf nu: werken via `release/next` | 09 | elke ronde eerst op de preview, dan live |

### Deel 3. Daarna, voordat er echte gebruikers komen

| Wat | Handleiding | Waarom |
|---|---|---|
| Lokaal werken tegen de dev-branch | 07 | Nooit tegen productie: `.env.local` wijst naar de branch `dev` van Neon |
| Werken met een releasebranch | 09 | Zodra er echte gebruikers zijn niet meer rechtstreeks op `main`: eerst testen op de vaste preview van `release/next`, dan live |
| De manier van inloggen | 05, Microsoft Entra, of 05b, wachtwoordlogin | Rollen voor de eerste mensen, tweestapsverificatie |
| De rooktest | 08 | `pnpm smoke:prod` is groen |
| GitHub, Vercel en Neon afmaken | 02, 03, 04 | Organisatie, tweestapsverificatie, regio, preview-branches, plafonds |
| De modules die je in de wizard aanzette | 20 of 20b (mail), 21 (Teams), 22 (bestanden), 23 (crons), 24 (AI) | Niets ervoor |
| Altijd | 30, beveiliging en kosten; 90, als iets misgaat | Overzicht en rust |

## Wat je nodig hebt voordat je begint

| Nodig | Waarom | Heb je dat |
|---|---|---|
| De zeven stappen van deel A in de wizard afgevinkt | Accounts, software, git en een werkmap staan klaar; het controlescript is groen | |
| Een e-mailadres van de organisatie, geen privéadres | Alle accounts hangen eraan en moeten overdraagbaar zijn | |
| Een telefoon met een authenticator-app | Tweestapsverificatie bij GitHub, Vercel, Neon en Azure | |
| Een wachtwoordmanager | Elke dienst krijgt een eigen, lang wachtwoord | |
| Een budget per maand en wie dat goedkeurt | Elke dienst krijgt een plafond (handleiding 30) | |
| Als je via Microsoft wilt inloggen: een beheerder van de tenant | Een app registreren en rollen toekennen kan alleen een beheerder | |

## Vier dingen die overal gelden

1. **Accounts van de organisatie, niet van een persoon.** Een GitHub-organisatie, een Vercel-team,
   een Neon-project onder een organisatie-adres. Als jij weggaat, blijft de tool van de organisatie.
2. **Een geheim komt nergens anders dan in Vercel en in `.env.local`.** Niet in de chat met Claude,
   niet in een document, niet in een bericht. Claude heeft alleen de naam van een variabele nodig.
3. **Elke dienst krijgt een plafond** dat zo laag staat als kan, met harde limieten waar die bestaan.
   Een onverwachte rekening is bijna altijd een vergeten plafond.
4. **Productie raak je alleen via een deploy.** Lokaal werk je tegen de branch `dev` van Neon
   (handleiding 07), nooit tegen de productiedatabase. En zodra er echte gebruikers zijn, gaat een
   wijziging eerst naar de releasebranch `release/next` en pas daarna naar `main` (handleiding 09).

## Wat Claude Code doet en wat jij doet

Claude Code bouwt, test en levert op; jij beslist, controleert en doet alles buiten de code: accounts,
variabelen, rollen in de tenant, een postbus. `docs/WERKWIJZE.md` beschrijft het samenspel per ronde.
Elke handleiding eindigt met "Vul in": de namen van wat je aanmaakte, zodat de volgende persoon het
terugvindt. Nooit het geheim zelf.

## Als het misgaat

| Wat je ziet | Waar je kijkt |
|---|---|
| Je laptop is niet klaar | Het controlescript uit `wizard/controle-laptop.md`, dan de stap van deel A die het noemt |
| Een stap lukt niet | De tabel "Als het misgaat" onderaan die handleiding, dan handleiding 90 |
| De tool doet het niet na een wijziging | Beheer, Systeem in de tool, dan handleiding 90 |
| Je weet niet welke variabele waar hoort | Handleiding 06, de tabel per omgeving |
