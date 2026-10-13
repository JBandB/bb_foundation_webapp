# Specificatie: Webapp

Versie 0.1, 2 oktober 2026. Dit document groeit uit het projectplan (`docs/PROJECTPLAN.md`); de
eerste ronde van Claude vult hoofdstuk 1, 2, 5, 6, 7 en 10 en legt de eerste eigen besluiten vast.

### Wijzigingen in dit document

| # | Wat | Waar |
|---|---|---|
| S1 | Skelet aangemaakt uit het template | overal |

## 1. Doel en context

[nog in te vullen uit PROJECTPLAN 1, 2 en 3]

## 2. Non-goals

| Niet bouwen | Wanneer wel |
|---|---|
| [nog in te vullen uit PROJECTPLAN 8] | |

## 3. Besluitenlog

Elk besluit krijgt een nummer dat nooit verandert, een datum, en de prijs erbij: wat het kost of wat
het onmogelijk maakt. Een besluit omkeren gebeurt met een nieuw besluit dat naar het oude verwijst,
nooit door het oude te wijzigen. "Over de tool" toont deze tabel in de applicatie.

### 3.1 Het lopende besluitenlog, begonnen op 2 oktober 2026

| # | Besluit | Waarom, en wat het kost |
|---|---|---|
| D1 | **Dit project is gemaakt uit het template BB_foundation_webapp.** Bestanden met de kop `template-owned` zijn van het template en worden alleen via `pnpm template:update` gewijzigd; de rest is van het project. | Eén bron voor de werkwijze en de lessen van eerdere projecten, en updates zonder opnieuw te beginnen. De prijs: eigen aanpassingen in een template-owned bestand gaan bij een update verloren, tenzij je het bestand met `pnpm template:adopt` van het project maakt. |
| D2 | **Eén inlogmodule per project, gekozen bij het aanmaken** (`auth.provider` in `project.config.json`). Met een Microsoft 365-tenant is dat `auth-entra`: rollen komen uit het token en worden in Entra toegekend. Zonder tenant is het `auth-password`: eigen accounts, uitgenodigd door een beheerder, met tweestapsverificatie en vergrendeling. | Twee deuren tegelijk zijn twee keer de aanvalsvlakte en twee keer het beheer. De prijs: wisselen is later een migratie van identiteiten, dus kies nu goed. |
| D3 | **Eén organisatie per database.** `organisation_id` staat op elke tabel en een unieke index staat precies één rij in `organisations` toe. | Elke query draagt de organisatie mee, dus een tweede organisatie is later geen herbouw maar een nieuw besluit over autorisatie en isolatie. De prijs: tot dat besluit is er geen multi-tenant. |
| D4 | **Neon in Frankfurt, met een dev-branch per ontwikkelaar en een wegwerpbranch per pull request.** Geen lokale Postgres. | Een lokale database mist extensies en wijkt in versie af, zodat een constraint pas in productie afgaat. De prijs: werken zonder internet kan niet, en een slapende compute kost bij het eerste verzoek een paar seconden. |
| D5 | **Vercel in dezelfde regio als de database, previews alleen uit een pull request, en de build migreert zelf** (`pnpm db:deploy` vóór `next build`, met een guard op het productie-endpoint). | Een preview zonder pull request heeft geen eigen database en zou op productie uitkomen; de guard weigert dan. De prijs: een "Redeploy" vanuit de console op een andere branch dan `main` faalt met opzet. |
| D6 | **Twee modi, licht en donker, allebei uit de tokens in `app/theme.css`,** en elke tint door `pnpm check:contrast`. | Een scherm dat in één modus klopt is half af, en contrast narekenen is goedkoper dan het later terugvinden. De prijs: elk nieuw scherm in beide modi bekijken. |
| D7 | **De versie staat in beeld en elke pull request hoogt hem op,** met een regel in `RELEASE-NOTES.md` en een in `RELEASE-NOTES-KORT.md`. | Zonder zichtbare versie is "werkt het al?" niet te beantwoorden. De prijs: een pull request zonder versie en notes is niet klaar. |
| D8 | **Git doet de mens.** Claude Code commit, pusht en brancht niet. | Wie merget moet weten wat er verandert, en dat lees je bij het committen. De prijs: elke ronde eindigt met een paar minuten handwerk. |
| D9 | **Modules worden bij het aanmaken gekozen en later alleen toegevoegd** (`pnpm template:add`); verwijderen is handwerk met een besluit erbij. | Een module brengt tabellen en migraties mee die data kunnen dragen. De prijs: een module die er eenmaal is, blijft, en haar tabellen ook. |
| D10 | **De taal van de interface is één keuze per project** (`uiLanguage`), de documentatie is Nederlands en code is Engels. | Eén taal in de interface houdt de teksten op één plek en de tests eenduidig. De prijs: een tweede taal later betekent elke tekst twee keer en een test die vergeten vertalingen vindt (patroon `tweede-ui-taal`). |
| D11 | **Elke dienst heeft een uitgavenplafond, zo laag mogelijk en hard waar dat kan.** Het budget en de plek van elk plafond staan in de checklist en in kopje 10 van het projectplan. | Een plafond dat bereikt wordt zet een dienst stil, en dat is beter dan een rekening die niemand verwachtte. De prijs: een maandelijkse blik op de kosten, en een keer een tool die stilstaat tot iemand het plafond verhoogt. |
| D12 | **GitHub op het gratis plan, zonder branch protection; de CI is advies.** Werken via pull requests is afspraak. | Branch protection op een privé-repo vraagt GitHub Team, en dat is in de startfase niet nodig als iedereen via een pull request werkt. De prijs: niets houdt een push naar `main` technisch tegen; wie dat slot wil, betaalt voor Team en zet het aan. |

## 4. Stack en conventies

Next.js (App Router) met TypeScript, Neon Postgres via Drizzle, Auth.js, Tailwind, deploy op
Vercel. De vaste regels staan in `CLAUDE.md`; de lessen die eraan ten grondslag liggen in
`docs/lessen/`.

## 5. Datamodel

[nog in te vullen uit PROJECTPLAN 4]

## 6. Autorisatiemodel

[nog in te vullen uit PROJECTPLAN 3: rollen, wat waarachter zit, en de drie lagen van handhaving:
de rail filtert, de pagina assert, de leesfunctie assert]

## 7. Kernflows

[nog in te vullen uit PROJECTPLAN 5]

## 8. Rekenregels

[alleen als het project rekent]

## 9. Koppelingen

[nog in te vullen uit PROJECTPLAN 7]

## 10. Fasen en exitcriteria

[nog in te vullen uit PROJECTPLAN 9]

## 11. Front-end en huisstijl

Zie `docs/THEME.md`. De kleuren komen uit `project.config.json`.

## 12. Backup, retentie en privacy

[nog in te vullen uit PROJECTPLAN 10]

## 13. Openstaande punten

| # | Vraag | Wie beantwoordt | Blokkeert |
|---|---|---|---|
| V1 | [nog in te vullen uit PROJECTPLAN 11] | | |
