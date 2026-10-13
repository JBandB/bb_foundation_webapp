<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 01. Start hier

**Wat het is.** De volgorde waarin je een nieuw project uit dit template in de lucht brengt: van een
lege repo tot een adres waar je collega's kunnen inloggen. Elke stap heeft een eigen handleiding die
klik voor klik gaat. **Tijd:** een dagdeel voor 02 tot en met 08, verspreid over een paar dagen als
je op anderen moet wachten (een beheerder van de tenant, een creditcard voor Vercel).

Je hoeft geen ontwikkelaar te zijn. Je hoeft wel precies te doen wat er staat, en te stoppen bij een
stap waar je de rechten niet hebt: half ingericht is erger dan wachten.

## De volgorde

| Stap | Handleiding | Wat je daarna hebt | Blokkeert |
|---|---|---|---|
| 1 | 10, een projectplan schrijven, en de wizard (`wizard/index.html`) | `project.config.json`, `docs/PROJECTPLAN.md`, je checklist, de startprompt | alles |
| 2 | 02, GitHub | een privérepo uit het template, met tweestapsverificatie | 03 |
| 3 | 03, Vercel | een project dat bij elke push bouwt, in Frankfurt | 04, 06 |
| 4 | 04, Neon | een database in Frankfurt met een dev-branch | 06 |
| 5 | 05, Microsoft Entra, of 05b, wachtwoordlogin | de manier van inloggen | 06 |
| 6 | 06, variabelen in Vercel | de geheimen op hun plek, nergens anders | 07, 08 |
| 7 | 07, lokaal werken | de tool draait op je eigen machine tegen de dev-branch | het bouwen |
| 8 | 08, eerste deploy en rooktest | de tool staat live en `pnpm smoke:prod` is groen | gebruikers |
| later | 20 of 20b (mail), 21 (Teams), 22 (bestanden), 23 (crons) | de modules die je in de wizard aanzette | niets ervoor |
| altijd | 30, beveiliging en kosten; 90, als iets misgaat | overzicht en rust | |

## Wat je nodig hebt voordat je begint

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Een e-mailadres van de organisatie, geen privéadres | Alle accounts hangen eraan en moeten overdraagbaar zijn | |
| Een telefoon met een authenticator-app | Tweestapsverificatie bij GitHub, Vercel, Neon en Azure | |
| Een wachtwoordmanager | Elke dienst krijgt een eigen, lang wachtwoord | |
| Een budget per maand en wie dat goedkeurt | Elke dienst krijgt een plafond (handleiding 30) | |
| Als je via Microsoft wilt inloggen: een beheerder van de tenant | Een app registreren en rollen toekennen kan alleen een beheerder | |

## Drie dingen die overal gelden

1. **Accounts van de organisatie, niet van een persoon.** Een GitHub-organisatie, een Vercel-team,
   een Neon-project onder een organisatie-adres. Als jij weggaat, blijft de tool van de organisatie.
2. **Een geheim komt nergens anders dan in Vercel en in `.env.local`.** Niet in de chat met Claude,
   niet in een document, niet in een bericht. Claude heeft alleen de naam van een variabele nodig.
3. **Elke dienst krijgt een plafond** dat zo laag staat als kan, met harde limieten waar die bestaan.
   Een onverwachte rekening is bijna altijd een vergeten plafond.

## Wat Claude Code doet en wat jij doet

Claude Code bouwt, test en levert op; jij beslist, controleert en doet alles buiten de code: accounts,
variabelen, rollen in de tenant, een postbus. `docs/WERKWIJZE.md` beschrijft het samenspel per ronde.
Elke handleiding eindigt met "Vul in": de namen van wat je aanmaakte, zodat de volgende persoon het
terugvindt. Nooit het geheim zelf.

## Als het misgaat

| Wat je ziet | Waar je kijkt |
|---|---|
| Een stap lukt niet | De tabel "Als het misgaat" onderaan die handleiding, dan handleiding 90 |
| De tool doet het niet na een wijziging | Beheer, Systeem in de tool, dan handleiding 90 |
| Je weet niet welke variabele waar hoort | Handleiding 06, de tabel per omgeving |
