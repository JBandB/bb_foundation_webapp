# Projectplan: {{project.name}}

Opgesteld op {{today.long}} voor {{project.organisation.name}}. Dit is het document waar alles uit
volgt: Claude Code leidt er de specificatie, het datamodel, de rechten en de schermen uit af. Schrijf
in gewone taal, in zelfstandige naamwoorden en werkwoorden, en zeg wat er moet gebeuren en niet hoe
het gebouwd wordt. Handleiding 10 (`docs/handleiding/10-projectplan-schrijven.md`) legt per kopje
uit wat een goed antwoord is, met voorbeelden. Vervang de cursieve aanwijzingen door je eigen tekst.

## 1. Waarom dit project

_Welk probleem lost het op, voor wie, en wat gebeurt er als het er niet komt? Twee alinea's. Claude
maakt hiervan de inleiding van `docs/SPEC.md` en de eerste regels van `README.md`._

## 2. Wanneer het geslaagd is

_Eén meetbare zin per fase: "fase 1 is klaar als elke vrijwilliger zijn diensten hier ziet en de
coördinator er geen mail meer over stuurt." Dit wordt het exitcriterium en de kernflow van de e2e._

## 3. Wie gebruikt het

_Een tabel: rol, wie dat zijn, wat ze mogen, wat ze uitdrukkelijk niet mogen. De rollen hier zijn de
rollen in `project.config.json`; wat ze mogen wordt de rechtenmatrix._

| Rol | Wie | Mag | Mag niet |
|---|---|---|---|
| | | | |

## 4. Kernbegrippen

_De zelfstandige naamwoorden van het project, elk met één zin en de relaties ertussen: "een dienst
hoort bij een locatie en heeft nul of meer deelnemers." Dit wordt het datamodel._

## 5. Processen

_De werkwoorden: wat doet wie, in welke volgorde, en wat is daarna anders? Eén proces per kopje, als
genummerde stappen. Dit worden de kernflows, de server actions en de controlescripts._

## 6. Regels die nooit mogen breken

_Genummerd P1, P2, ... Dingen die altijd waar moeten zijn, ook als niemand kijkt: "een dienst kan
niet twee keer aan dezelfde persoon worden toegewezen." Ze komen in `CLAUDE.md` onder "Van dit
project" en worden constraints in de database waar dat kan._

## 7. Gegevens van buiten en koppelingen

_Wat komt er van buiten (een bestand, een ander systeem, mail) en wat gaat er naar buiten? Per
koppeling: welke richting, hoe vaak, wat als het stuk is. Dit bepaalt welke modules aan staan en
welke taken in de wachtrij komen._

## 8. Wat we niet bouwen

_Expliciet. Wat lijkt erbij te horen maar hoort er niet bij, en waarom. Dit is de fasegrens waar
Claude niet overheen mag, ook niet "even snel"._

## 9. Fasen

_Eén tot vier fasen, elk met wat erin zit, het exitcriterium uit kopje 2, en het handwerk buiten de
code dat ervoor nodig is (accounts, een postbus, een container)._

## 10. Randvoorwaarden

_Accounts en wie ze beheert, het budget per maand en waar het plafond staat, bewaartermijnen en
privacy (welke gegevens zijn gevoelig), de taal van de interface, de huisstijl._

## 11. Open vragen

_Genummerd V1, V2, ... Wat je nog niet weet, met wie het antwoord heeft. Een open vraag is geen
reden om te wachten; Claude bouwt om de vraag heen en zegt waar hij een aanname deed._

## 12. Wijzigingen aan dit plan

_Een regel per wijziging: datum, wat, waarom. Het plan verandert; dit kopje laat zien hoe._

| Datum | Wijziging | Waarom |
|---|---|---|
| {{today.long}} | Eerste versie. | |
