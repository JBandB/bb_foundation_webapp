<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 22. Azure Blob Storage voor bestanden

**Wat het is.** Een opslagcontainer in Azure waar de tool bestanden neerzet en ophaalt, met een
token dat alleen de server kent. Voor een project met de module files. **Tijd:** een half uur.

**Doe dit na** 06. **Daarna kun je** uploaden in de schermen die het project daarvoor bouwt.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Een Azure-abonnement van de organisatie, met rechten om een storage account te maken | | |
| Een EU-regio (West Europe of North Europe) | De bestanden blijven in de EU | |
| Een idee van de bewaartermijn | Een container kan een bewaarbeleid krijgen | |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een resource group | `<slug>-opslag` | nergens |
| Een storage account | de slug zonder streepjes plus `opslag`, kleine letters en cijfers | `AZURE_STORAGE_ACCOUNT` |
| Een privécontainer | `bestanden` (of per doel een eigen naam, zie `docs/patronen/extra-bestandsdoel.md`) | `AZURE_STORAGE_CONTAINER` |
| Een SAS-token op de container | | `AZURE_STORAGE_SAS_TOKEN` (Sensitive) en de vervaldatum in `BLOB_SAS_EXPIRES` |

## Stappen

1. portal.azure.com, **Resource groups, Create**: naam `<slug>-opslag`, regio West Europe.
   **Controle:** de groep bestaat.
2. **Storage accounts, Create** in die groep. Performance Standard, redundantie **LRS** (de database
   is de bron van waarheid voor alles behalve het bestand zelf). Onder Advanced: **Allow Blob
   anonymous access** uit, **Secure transfer required** aan.
   **Controle:** het account bestaat; onder Configuration staat anonieme toegang op Disabled.
3. In het account: **Containers, + Container**: naam `bestanden`, Public access level **Private**.
   Vallen de bestanden onder een bewaarplicht, zet dan onder **Data management, Data protection** een
   bewaarbeleid of onveranderlijkheid op de container.
   **Controle:** de container bestaat en is privé.
4. Op de container: **Shared access tokens**. Permissions **Read, Create, Write** (geen Delete, geen
   List), een vervaldatum van hoogstens een jaar, protocol HTTPS only. **Generate**. Kopieer de
   **Blob SAS token** (begint met `sv=` of `?sv=`), niet de hele URL.
   **Controle:** het token staat in je wachtwoordmanager; de vervaldatum staat in je checklist en in
   je agenda, een maand ervoor.
5. Zet in Vercel (alle omgevingen) en in `.env.local`: `AZURE_STORAGE_ACCOUNT`,
   `AZURE_STORAGE_CONTAINER`, `AZURE_STORAGE_SAS_TOKEN` (Sensitive), `BLOB_SAS_EXPIRES` als
   `jjjj-mm-dd`. Gebruik voor Development liefst een tweede container (`bestanden-dev`) met een eigen
   token, zodat een test niet tussen de echte bestanden komt. Deploy opnieuw.
   **Controle:** Beheer, Systeem toont "Bestandsopslag" met de dagen tot het token verloopt.
6. `pnpm blob:status`: een pixel erin en weer eruit, per doel.
   **Controle:** "ok: geschreven en teruggelezen".

## Waarom zo

Het SAS-token staat op de server en komt nooit in de browser: downloaden gaat via de route van de
tool, die het recht controleert en de inhoud doorgeeft. Geen Delete op het token, want er is geen
codepad dat verwijdert: een token dat het niet kan, is een slot erbij. De grens van vier megabyte is
die van een server action op Vercel; groter vraagt een andere weg en dat is een besluit van het
project.

## Beveiliging

- Anonieme toegang uit, container privé, token met vervaldatum. Een verlopen token stopt uploaden en
  downloaden; Beheer, Systeem waarschuwt dertig dagen van tevoren via `BLOB_SAS_EXPIRES`.
- De inhoud van een bestand wordt nagekeken voordat hij de opslag in gaat (type, eerste bytes, geen
  macro's). Wat niet is wat het zegt, komt er niet in.
- Een nieuw token maken en het oude laten verlopen is de manier om een gelekt token ongeldig te maken.

## Kosten

Plan: pay as you go; een storage account kost centen per gigabyte per maand plus transacties.
Plafond: een **budget** met een waarschuwing op de resource group (Cost Management, Budgets). Uit je
checklist: het deel voor Azure. Stand van oktober 2026.

## Zo zie je dat het goed staat

- `pnpm blob:status` is groen en Beheer, Systeem toont de dagen tot de vervaldatum.
- Een upload in de tool verschijnt in de container onder `<doel>/<entiteit>/<id>/`.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| "AuthenticationFailed" | Het token hoort bij een andere container of het account klopt niet |
| "AuthorizationPermissionMismatch" | Het token mist Create of Write |
| Uploaden werkt, downloaden geeft 502 | Het token mist Read |
| "Het bestand is te groot" | Boven de grens van het doel (standaard 4 MB); dat is de bedoeling |
| Alles stopt op één dag | Het token is verlopen; maak een nieuw en zet de nieuwe datum in `BLOB_SAS_EXPIRES` |

## Vul in

| Wat | Waarde |
|---|---|
| Abonnement en resource group | |
| Storage account en container(s) | |
| Token verloopt op | |
| Bewaartermijn | |
| Datum ingericht | |
