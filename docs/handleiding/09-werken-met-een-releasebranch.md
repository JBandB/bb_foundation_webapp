<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 09. Werken met een releasebranch

**Wat het is.** De vaste manier om een wijziging live te zetten. Elke ronde komt op de branch
`release/next`. Vercel bouwt daar een preview van, met een eigen kopie van de database. Jij kijkt op
die preview, en pas daarna gaat het naar `main` en dus live. **Tijd:** een kwartier de eerste keer,
daarna een paar minuten per ronde.

**Doe dit na** 08. **Daarna kun je** elke ronde zo opleveren.

## Waarom

Niets gaat live voordat je het op de preview hebt gezien. Op `main` zet Vercel alles meteen op
productie, ook een fout. Op `release/next` zie je eerst of het werkt: de nieuwe schermen, het
inloggen, en een migratie op een kopie van de echte database. Gaat er iets mis, dan merkt alleen jij
het.

Het is elke keer dezelfde naam. Daardoor heeft de preview steeds hetzelfde adres, en dat adres kun je
bewaren, delen en (met Microsoft-inloggen) één keer bij Microsoft opgeven.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| De tool staat live (08) | Je werkt verder op iets wat al draait | |
| Een preview per pull request in Vercel (03, stap 5) en een databasebranch per preview in Neon (04, stap 3) | Zonder die twee heeft de preview geen eigen database | |
| VS Code met de map van je project open | Hier doe je de stappen in git | |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een branch, per ronde opnieuw | `release/next` | nergens; na het mergen gaat hij weg |
| Een pull request, per ronde | de versie, zoals `v0.07: diensten aanmaken` | nergens |
| Een databasebranch, vanzelf | `preview/release/next` in Neon | nergens; Neon ruimt hem op als de pull request sluit |
| Het vaste previewadres, één keer | `https://<project>-git-release-next-<team>.vercel.app` | Vul in, en bij Microsoft-inloggen een redirect-URI (zie hieronder) |

## Stappen

1. **Begin op een verse `main`.** Klik in VS Code linksonder op de naam van de branch en kies `main`.
   Open **Source Control** (het icoon met de vertakking links) en kies in het menu met de drie
   puntjes **Pull**.
   **Controle:** linksonder staat `main` en er staan geen wijzigingen open in Source Control.
2. **Maak de branch.** Klik linksonder op `main`, kies **Create new branch...** en typ
   `release/next`. Doe dit vóór je Claude de opdracht geeft. Vergeten? Geen probleem: de wijzigingen
   in je werkmap gaan mee naar de nieuwe branch.
   **Controle:** linksonder staat `release/next`.
3. **Laat Claude bouwen.** Claude levert op met een versie en met wat jij nog met de hand doet.
   Claude doet zelf geen git.
   **Controle:** de oplevering noemt de nieuwe versie.
4. **Commit.** In Source Control: typ een boodschap (`feat: diensten aanmaken`) en klik **Commit**.
   Vraagt VS Code of hij alle wijzigingen moet meenemen: ja.
   **Controle:** Source Control is leeg.
5. **Zet de branch op GitHub.** Klik **Publish Branch**. Bij een tweede commit op dezelfde branch
   heet die knop **Sync Changes**.
   **Controle:** op GitHub staat de branch `release/next`.
6. **Open de pull request.** Op de pagina van je repo op GitHub staat een gele balk met **Compare &
   pull request**. Base is `main`, compare is `release/next`. Titel: de versie. Klik **Create pull
   request**.
   **Controle:** de pull request staat open en de CI loopt.
7. **Wacht op de preview.** Vercel bouwt binnen een paar minuten. De bouw draait de migraties op de
   eigen databasebranch van de preview, niet op productie. De Vercel-bot zet daarna een reactie in de
   pull request met een link **Visit Preview**. Het vaste adres werkt ook.
   **Controle:** de check van Vercel is groen en de preview toont het inlogscherm met de nieuwe versie.
8. **Test op de preview.** Log in en klik door wat er nieuw is, in beide modi als het een nieuw scherm
   is. De database is een kopie van productie op het moment van de eerste bouw van de preview: je accounts
   bestaan er dus, en wat je hier verandert, raakt productie niet.
   **Controle:** de versie linksonder in de rail is de nieuwe, en wat je zag klopt.
9. **Iets niet goed?** Vraag Claude om de reparatie, commit opnieuw op `release/next` en klik **Sync
   Changes**. Vercel bouwt de preview opnieuw, op hetzelfde adres.
   **Controle:** de preview toont de reparatie.
10. **Merge.** Op GitHub, in de pull request: **Merge pull request**, dan **Confirm merge**. Vercel
    zet het nu live en draait de migraties op productie.
    **Controle:** de productiedeploy is groen en de versie op het productieadres is de nieuwe.
11. **Ruim de branch op.** Klik op GitHub direct na de merge op **Delete branch**. In VS Code:
    linksonder naar `main`, **Pull**, en dan via het opdrachtenpalet (Ctrl+Shift+P) **Git: Delete
    Branch...** en kies `release/next`. Zo kun je de volgende ronde weer dezelfde naam gebruiken.
    **Controle:** linksonder staat `main`, en `release/next` staat niet meer in de lijst van branches.

De volgende ronde begin je weer bij stap 1.

## Met Microsoft-inloggen (module auth-entra)

Microsoft accepteert alleen adressen die letterlijk bij de app staan. Een adres met een sterretje
mag niet. Een preview met een willekeurig adres kan dus niet inloggen, het vaste adres wel. Voeg het
één keer toe, zoals in 05, stap 2:

`https://<project>-git-release-next-<team>.vercel.app/api/auth/callback/microsoft-entra-id`

Neem het adres over uit Vercel: open de deployment van de preview en kijk onder **Domains**. Is de
naam van project en team samen lang, dan kort Vercel het adres in, en dan klopt het voorbeeld
hierboven niet meer.

**Controle:** inloggen met Microsoft op het vaste adres lukt. Op de link uit de Vercel-bot lukt het
niet, en dat is goed.

Met de wachtwoordlogin (05b) werkt elk previewadres. Het vaste adres blijft handig om te delen.

## Op de workshopdag werkten we direct op main

Dat mocht, omdat er toen nog niemand anders in de tool zat. Direct op `main` is de uitzondering en
mag alleen als beide waar zijn:

- je werkt alleen aan het project, en
- er zijn nog geen echte gebruikers en er staan geen echte gegevens in.

Zodra een collega of een klant de tool gebruikt, werk je op `release/next`. Een fout op `main` staat
direct bij hen in beeld. Een fout op de preview zie alleen jij.

Wie tot nu toe op `main` werkte: begin bij stap 1. Er hoeft niets om.

## Beveiliging

- Previews zijn beschermd met Vercel Authentication (03, stap 4). Wie geen toegang heeft tot je
  Vercel-team, komt niet op het vaste adres. Wil je het toch laten zien, gebruik dan de knop
  **Share** in de werkbalk van de preview.
- De database van de preview is een kopie van productie, met echte gegevens. Behandel het adres
  zoals het productieadres.
- De preview heeft een eigen `AUTH_SECRET` (06, stap 1). Een sessie op de preview geldt dus niet op
  productie, en andersom.

## Kosten

Elke pull request kost bouwminuten bij Vercel en een databasebranch bij Neon die even wakker is. Neon
ruimt die branch op als de pull request sluit. Met één pull request tegelijk blijft dat klein; kijk
maandelijks in beide consoles of je binnen je plan blijft. Stand van oktober 2026.

## Zo zie je dat het goed staat

- Elke ronde heeft een pull request met een groene CI en een groene check van Vercel.
- In Neon staat `preview/release/next` zolang de pull request open is, en daarna niet meer.
- Na het mergen toont productie de nieuwe versie, en `release/next` bestaat niet meer.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| Na **Publish Branch** bouwt Vercel niets | Zo ingesteld: zonder pull request geen preview (03, stap 5). Open de pull request |
| **Create new branch** zegt dat `release/next` al bestaat | De vorige ronde is niet opgeruimd. Doe stap 11, dan stap 1 |
| De pull request heeft een conflict met `main` | Er is intussen iets anders op `main` gezet. Vraag Claude om het conflict op te lossen; jij commit daarna |
| De preview toont nog de vorige versie | De bouw loopt nog, of de laatste commit staat niet op GitHub: klik **Sync Changes** |
| Inloggen op de preview lukt niet met Microsoft (AADSTS50011) | Het vaste adres staat niet als redirect-URI bij de app, of je opende de link van de bot. Zie hierboven |
| Met de wachtwoordlogin lukt inloggen op de preview niet voor een account met tweestapsverificatie | `MFA_SECRET_KEY` ontbreekt of verschilt tussen Production en Preview, en de preview kan het opgeslagen geheim daarom niet lezen. Probeer het daar niet vaker: na een paar pogingen gaat het account op de preview op slot. Zet `MFA_SECRET_KEY` gelijk in Production en Preview (05b), log één keer in op productie zodat het geheim wordt omgezet, en open daarna een nieuwe pull request, zodat de kopie het omgezette geheim heeft |
| Een migratie faalt in de bouw van de preview | Precies waarvoor de preview er is: productie is niet geraakt. Geef Claude de melding uit de build-log |
| Je hebt per ongeluk op `main` gecommit | Nog niet gepusht: maak alsnog de branch (stap 2), die neemt de commit mee. Vraag Claude welke stappen `main` weer gelijk zetten met GitHub; jij voert ze uit. Al gepusht: het staat live, zie 90 |

## Vul in

| Wat | Waarde |
|---|---|
| Vast previewadres | |
| Redirect-URI toegevoegd in Entra (alleen auth-entra) | |
| Datum ingericht | |
