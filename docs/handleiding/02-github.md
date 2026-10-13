<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 02. GitHub

**Wat het is.** GitHub bewaart de code en draait bij elke wijziging de controles (de CI). Vercel haalt
de code hier op. **Tijd:** een half uur.

**Doe dit na** 01 en de wizard. **Daarna kun je** het Vercel-project aanmaken (03).

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Een GitHub-account op een adres van de organisatie | De organisatie wordt eigenaar van de repo | |
| Leesrecht op de repo van het template | "Use this template" werkt alleen als je erbij kunt | |
| Een authenticator-app | Tweestapsverificatie is verplicht in de organisatie | |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een organisatie | de naam van je organisatie, kort, kleine letters | nergens in de code |
| Een repo uit het template | de slug van je project (`project.slug`) | Vercel importeert hem (03); `template.source` in `project.config.json` als je updates wilt ophalen |

## Stappen

1. Ga naar github.com, log in, en kies rechtsboven **Your organizations, New organization**. Kies het
   **Free**-plan en de naam van je organisatie. Maak de repo niet onder je eigen account.
   **Controle:** de organisatie staat in je lijst en jij bent Owner.
2. **Settings** van de organisatie, **Authentication security**: zet **Require two-factor
   authentication** aan.
   **Controle:** de instelling staat aan; wie het niet heeft, wordt uit de organisatie gezet.
3. Open de repo van het template en klik **Use this template, Create a new repository**. Owner: je
   organisatie. Naam: de slug van je project. Zichtbaarheid: **Private**. Laat "Include all branches"
   uit.
   **Controle:** de nieuwe repo bestaat, met `template/manifest.json` en `project.config.json` erin, en
   onder **Actions** loopt de workflow CI groen (de wortel van het template bouwt).
4. In de repo: **Settings, Code security**: zet **Dependabot alerts** en **Secret scanning** aan (met
   push protection als het beschikbaar is).
   **Controle:** beide staan op Enabled.
5. **Settings, Actions, General**: Workflow permissions op **Read repository contents and packages
   permissions**. In de organisatie: **Settings, Billing, Spending limits**: de limiet voor Actions op
   **0** (het gratis quotum is genoeg voor deze CI).
   **Controle:** een push bouwt nog steeds; het quotum staat onder Billing, Usage.
6. Zet de uitvoer van de wizard in de repo: `project.config.json` over de bestaande, `docs/PROJECTPLAN.md`
   over de bestaande, de checklist in `docs/handleiding/`, een logo in `public/brand/`. Commit en push op
   een branch en open een pull request; na de groene CI merg je naar `main`.
   **Controle:** de CI van de pull request is groen, ook de stap "Het template is intact".
7. Geef collega's toegang via **Settings, Collaborators and teams**: wie bouwt krijgt Write, wie alleen
   meekijkt Read. Maak een team als het er meer dan twee zijn.
   **Controle:** de collega ziet de repo zonder dat jij hem een link stuurt.

## Waarom zo

Een persoonlijk account is niet overdraagbaar: als de eigenaar vertrekt, hangt de code aan iemand die
er niet meer is. Een organisatie wel. Tweestapsverificatie verplicht stellen is de ene instelling die
de meeste overnames van accounts voorkomt. Privé, omdat de repo de configuratie en de documentatie
van de organisatie bevat; geheimen staan er nooit in, maar namen en plannen wel.

## Beveiliging

- Geen geheimen in de repo. `.env.local` staat in `.gitignore` en de huisregel `env-template`
  weigert een waarde in `.env.example`. Secret scanning is het vangnet.
- Het gratis plan heeft **geen branch protection** op een privérepo. De CI is advies: een rode CI
  houdt een merge niet tegen. De werkwijze (altijd via een pull request, kijken of de CI groen is)
  vangt dat op. Wil je het slot, dan is dat GitHub Team; dat is een besluit met een prijs per maand
  per persoon.
- Dependabot alerts zeggen wanneer een afhankelijkheid een bekend lek heeft. Claude kan de update
  doen; jij beslist wanneer.

## Kosten

Plan: **Free** voor de organisatie. Plafond: de uitgavenlimiet voor Actions op nul, zodat een
weggelopen workflow nooit een rekening wordt. Uit je checklist: het deel voor GitHub is nul. Upgraden
naar Team is alleen nodig voor branch protection op een privérepo of voor meer dan het gratis quotum
aan Actions-minuten, en dat haalt een project van deze omvang niet. Stand van oktober 2026.

## Zo zie je dat het goed staat

- Onder **Actions** is de laatste run op `main` groen.
- Onder **Settings, Code security** staan Dependabot alerts en Secret scanning op Enabled.
- `git clone` van de repo met een tweede account zonder toegang faalt.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| "Use this template" staat er niet | Je hebt geen leesrecht op het template, of de repo van het template is niet als template gemarkeerd (Settings, Template repository) |
| De CI faalt direct na het aanmaken | Kijk in de run welke stap; de wortel van het template hoort groen te zijn, dus meestal een netwerkfout in `pnpm install`: run opnieuw |
| Een collega ziet de repo niet | Hij is lid van de organisatie maar heeft geen rol op de repo; voeg hem toe onder Collaborators and teams |
| GitHub vraagt bij elke push om een wachtwoord | Gebruik een SSH-sleutel of de GitHub CLI (`gh auth login`); een wachtwoord werkt niet meer voor git |

## Vul in

| Wat | Waarde |
|---|---|
| Organisatie | |
| Repo | |
| Eigenaar (Owner) | |
| Wie Write heeft | |
| Datum aangemaakt | |
