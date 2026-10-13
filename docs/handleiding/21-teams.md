<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 21. Een Teams-kanaal

**Wat het is.** Meldingen die een mens nú moet zien gaan naar een Teams-kanaal in plaats van naar een
postbus, via een inkomende webhook van dat kanaal. Alleen als `messaging.teams` in
`project.config.json` aan staat en er berichtsoorten zijn met kanaal `teams`. **Tijd:** een kwartier.

**Doe dit na** 20 of 20b (de module messaging staat). **Daarna kun je** soorten op Teams zetten op
Beheer, Berichten.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Een Teams-kanaal waarvan jij eigenaar bent of waar je Workflows mag toevoegen | De webhook hoort bij het kanaal | |
| `messaging.teams: true` in de configuratie, gevolgd door `pnpm template:generate` | Anders doet de tool niets met Teams | |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een Workflow "Post to a channel when a webhook request is received" | de naam van je project | de HTTP POST URL wordt `TEAMS_WEBHOOK_URL` (Sensitive) |

## Stappen

1. In Teams, bij het kanaal, de drie puntjes, **Workflows**. Kies de sjabloon **Post to a channel when
   a webhook request is received**; het team en het kanaal staan al ingevuld. Opslaan geeft een
   **HTTP POST URL**. Kopieer die meteen: hij is daarna niet meer op te vragen.
   **Controle:** de workflow staat in de lijst van het kanaal.
2. Zet `TEAMS_WEBHOOK_URL` in Vercel, alleen **Production**, Sensitive. Preview en lokaal horen niet
   in het echte kanaal te plaatsen; lokaal zet je hem alleen in `.env.local` als je een test wilt.
   Deploy opnieuw.
   **Controle:** Beheer, Systeem noemt Teams niet meer als ontbrekend.
3. `pnpm teams:test`: één proefkaart in het kanaal. Kijk in het kanaal, niet op de console: een
   workflow antwoordt "geaccepteerd" op bijna elk bericht, ook op wat hij niet kan plaatsen.
   **Controle:** de kaart staat in het kanaal.
4. Op **Beheer, Berichten** staan de soorten met kanaal Teams; zet ze aan of uit.
   **Controle:** een melding verschijnt in het kanaal binnen een minuut na de handeling.

## Waarom zo

Een webhook geeft toegang tot één kanaal en is door de kanaaleigenaar in te trekken; het alternatief
(Graph) vraagt een recht dat in elk kanaal van de tenant mag schrijven. De klassieke Office
365-connectors worden uitgefaseerd, daarom een Workflow. De tool stuurt een Adaptive Card, de vorm
die deze workflow verwacht; het logboek zegt "verstuurd" zodra de workflow het bericht aannam.

## Beveiliging

- De URL is het geheim: wie hem heeft, kan in dat kanaal plaatsen, verder niets. Sensitive in Vercel.
- De workflow hoort bij het account dat hem maakte en stopt als dat account weggaat. Zet in je
  checklist wie dat is; dat is het eerste om na te kijken als de kaarten ooit stoppen.

## Kosten

Geen; Workflows zit in Microsoft 365. Stand van oktober 2026.

## Zo zie je dat het goed staat

- `pnpm teams:test` levert een kaart op in het kanaal.
- Beheer, Berichten toont een Teams-bericht met "het Teams-kanaal" in de kolom Naar en status
  "verstuurd".

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| "TEAMS_WEBHOOK_URL ontbreekt" | De variabele staat niet in deze omgeving (met opzet niet in Preview) |
| "Teams gaf status 4xx" | De URL is ingetrokken of de workflow is weg; maak een nieuwe |
| "Verstuurd" in het logboek, niets in het kanaal | De workflow accepteerde het bericht maar kon het niet plaatsen; controleer of de workflow nog aan het juiste kanaal hangt |
| De kaarten zijn opeens gestopt | Het account van de maker van de workflow is weg of gewijzigd |

## Vul in

| Wat | Waarde |
|---|---|
| Team en kanaal | |
| Wie de workflow maakte | |
| Datum ingericht | |
