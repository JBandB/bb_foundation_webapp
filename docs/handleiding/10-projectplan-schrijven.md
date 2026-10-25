<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 10. Een projectplan schrijven

**Wat het is.** `docs/PROJECTPLAN.md` is de input van het hele project: Claude Code leidt er de
specificatie, het datamodel, de rechten en de schermen uit af. Een goed plan kost een uur en bespaart
elke ronde daarna een misverstand. **Tijd:** een uur voor een eerste versie, en daarna een kwartier
per wijziging.

**Doe dit na** handleiding 01. **Daarna kun je** de startprompt aan Claude geven: uit een wizard (die
vraagt dezelfde dingen), of de startprompt hieronder.

## Vier regels

1. **Zelfstandige naamwoorden en werkwoorden.** Wat bestaat er, en wat gebeurt ermee. Een "dienst"
   is een ding; "een dienst toewijzen" is een proces. Een scherm is geen van beide: schermen volgen.
2. **Een eis is geen ontwerp.** "De coördinator ziet welke diensten nog open staan" is een eis.
   "Een tabel met een filter op datum en een rode badge" is een ontwerp, en dat laat je aan Claude en
   aan de huisstijl. Schrijf je toch een ontwerp op, zeg dan dat het een voorbeeld is.
3. **Meetbaar.** "Gebruiksvriendelijk" is niets; "een vrijwilliger zet zich in minder dan een minuut
   op een dienst vanaf zijn telefoon" is een test.
4. **Durf nee te zeggen.** Kopje 8 is het belangrijkste kopje. Alles wat je daar niet noemt, komt een
   keer terug als "kan dat er even bij".

## Per kopje: een slecht en een goed voorbeeld

De voorbeelden komen uit één verzonnen casus: een vrijwilligersrooster voor een kinderboerderij.

**1. Waarom.** Slecht: "We willen een moderne tool voor het rooster." Goed: "Het rooster staat in een
spreadsheet die drie mensen tegelijk bewerken. Elke week valt er een dienst uit omdat twee mensen
dachten dat de ander kwam, en de coördinator belt dan rond. Dat kost haar vier uur per week."

**2. Geslaagd.** Slecht: "Als iedereen het gebruikt." Goed: "Fase 1 is klaar als de coördinator twee
weken geen rooster meer per mail heeft gestuurd en elke dienst van de komende maand een naam heeft."

**3. Wie.** Slecht: "Gebruikers en beheerders." Goed: een tabel met `coordinator` (plant diensten,
ziet alle vrijwilligers, mag niemand verwijderen), `volunteer` (zet zichzelf op een open dienst,
ziet alleen eigen gegevens van anderen niet), `admin` (alles, inclusief accounts).

**4. Kernbegrippen.** Slecht: een lijst losse woorden. Goed: "Een **dienst** is een dagdeel op een
**locatie** (de stal, de kassa) met een gewenst aantal mensen. Een **inschrijving** koppelt een
**vrijwilliger** aan een dienst. Een vrijwilliger heeft een **beschikbaarheid** per weekdag."

**5. Processen.** Slecht: "Diensten beheren." Goed: "Een dienst vullen: 1. de coördinator maakt de
diensten van de maand aan; 2. vrijwilligers schrijven zich in; 3. drie dagen van tevoren krijgt wie
op een open dienst past een mail; 4. de dag ervoor krijgt elke ingeschrevene een herinnering."

**6. Regels.** Slecht: "Het moet kloppen." Goed: "P1: een vrijwilliger kan niet op twee diensten
tegelijk staan. P2: een dienst in het verleden verandert niet meer. P3: een minderjarige staat nooit
alleen op een dienst."

**7. Van buiten.** Slecht: "Koppelen met alles." Goed: "Eén keer per jaar komt de ledenlijst als
CSV uit het ledenpakket; wij lezen hem in en sturen niets terug. Mail gaat via de gedeelde postbus
van de vereniging."

**8. Niet.** Slecht: leeg. Goed: "Geen urenregistratie, geen onkosten, geen app in de winkels (de
website werkt op een telefoon), geen koppeling met de agenda van vrijwilligers in fase 1."

**9. Fasen.** Slecht: "Eerst alles, dan verbeteren." Goed: "Fase 1 rooster en inschrijven (handwerk:
de postbus en de ledenlijst). Fase 2 herinneringen en beschikbaarheid. Fase 3 een jaaroverzicht per
vrijwilliger."

**10. Randvoorwaarden.** Slecht: "Goedkoop en veilig." Goed: "Hoogstens 15 euro per maand, plafond
bij Vercel. Geboortedata zijn gevoelig: alleen de coördinator ziet ze, en ze gaan na twee jaar
inactiviteit weg. Nederlands. Geen huisstijl, de kleuren van de website."

**11. Open vragen.** Goed: "V1: mogen ouders van minderjarige vrijwilligers meekijken? (het bestuur,
voor fase 2)."

**12. Wijzigingen.** Elke keer dat je het plan aanpast één regel, zodat Claude ziet wat er anders is
sinds de vorige ronde.

## De startprompt

Een wizard maakt de startprompt voor je, met de configuratie en het plan erin. Zonder wizard zet je
eerst zelf twee bestanden klaar: `project.config.json` (kopieer `examples/default.project.config.json`
en pas het aan; `pnpm template:validate` controleert het) en `docs/PROJECTPLAN.md`. Commit en Sync,
want `pnpm template:apply` weigert op een werkmap met wijzigingen. Plak dan in het Claude-paneel:

    Lees CLAUDE.md, docs/WERKWIJZE.md, project.config.json en docs/PROJECTPLAN.md. Draai pnpm install
    en pnpm template:apply, en volg de slottekst. Lever daarna als v0.02 de eerste specificatie op,
    zonder iets te bouwen. Git doe ik zelf.

## Wat Claude ermee doet

Op de startprompt leest Claude het plan, `CLAUDE.md` en de documenten van het template, en levert
als eerste versie (`v0.02`) een `docs/SPEC.md` met het datamodel en de kernflows, de rechtenmatrix,
een roadmap met de fasen, en de besluiten die uit het plan volgen, zonder iets te bouwen. Daar lees
je op na: klopt het met wat je bedoelde? Pas dan begint het bouwen, per ronde.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| Claude stelt tien vragen voordat hij begint | Kopje 3, 4 of 8 is leeg of vaag; vul die eerst |
| Claude bouwt iets wat je niet vroeg | Kopje 8 mist het; zet het erbij en laat het weghalen |
| De rollen in de tool kloppen niet met de praktijk | Kopje 3 beschrijft functies in plaats van rechten; splits of voeg samen |
