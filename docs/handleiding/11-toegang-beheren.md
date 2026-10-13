<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 11. Toegang beheren

**Wat het is.** Wie er in de tool kan en met welke rol: erbij, een andere rol, eraf. Waar dat
gebeurt hangt af van de inlogmethode. **Tijd:** een minuut per persoon.

**Doe dit na** 08. **Daarna kun je** collega's laten inloggen.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Met Microsoft: een rol in de tenant die app roles mag toewijzen (Cloud Application Administrator of hoger) | De toewijzing gebeurt in Entra | |
| Met wachtwoord: de beheerdersrol in de tool | Beheer, Accounts | |
| De lijst van rollen uit `project.config.json` en wat ze mogen (Beheer, Toegang, "Wie mag wat") | Zodat je de juiste rol kiest | |

## Met Microsoft (module auth-entra)

De tool toont op **Beheer, Toegang** wie er heeft ingelogd en met welke rollen, zoals ze waren bij
de laatste login. Toekennen en afnemen gebeurt in Entra; de tool kan het niet en hoort het niet te
kunnen.

1. portal.azure.com, **Microsoft Entra ID, Enterprise applications**, zoek je project, **Users and
   groups, Add user/group**. Kies de persoon, kies de rol, **Assign**. Meerdere rollen is meerdere
   keren toewijzen.
   **Controle:** de persoon staat in de lijst met de rol; na zijn volgende login staat hij op Beheer,
   Toegang met die rol.
2. Een andere rol: dezelfde plek, de oude toewijzing verwijderen en de nieuwe toevoegen.
   **Controle:** de nieuwe rol geldt bij de volgende login (de sessie van acht uur loopt nog af).
3. Toegang afnemen: dezelfde plek, de persoon selecteren, **Remove**. Dat is de enige stap die werkt;
   een vinkje in de database doet bij Microsoft niets. Moet het onmiddellijk, wissel dan
   `AUTH_SECRET` in Vercel: iedereen is dan uitgelogd.
   **Controle:** de persoon krijgt bij inloggen van Microsoft de melding dat de app niet voor hem is.
4. De rij in `users` laat je staan: er kan geschiedenis aan hangen.

## Met wachtwoord (module auth-password)

Alles op **Beheer, Accounts**, met een auditregel per handeling.

1. **Uitnodigen** met het plusje: naam, adres, rollen. De persoon krijgt een koppeling per mail die
   zeven dagen werkt en kiest zelf een wachtwoord. Komt de mail niet aan, dan "Uitnodiging opnieuw
   sturen" achter Update.
   **Controle:** de status gaat van "uitgenodigd" naar "actief".
2. **Rollen wijzigen** achter Update: aanvinken, opslaan. Geldt bij het volgende verzoek van die
   persoon. De laatste beheerder kan zijn beheerdersrol niet verliezen.
3. **Deactiveren** achter Update: het account kan niet meer inloggen, de gegevens blijven. Jezelf
   deactiveren kan niet. "Weer activeren" zet het terug.
4. **Tweestapsverificatie resetten** als iemand zijn telefoon kwijt is: bij de volgende login stelt
   hij het opnieuw in via een koppeling per mail.
5. **Herstelkoppeling sturen** als iemand zijn wachtwoord kwijt is; de persoon kan dat ook zelf via
   "Wachtwoord vergeten?" op het inlogscherm.

## Waarom zo

Bij Microsoft is de tenant de bron: wie de organisatie verlaat, verliest zijn account en daarmee
alles tegelijk, zonder dat iemand in de tool iets hoeft te doen. Bij wachtwoorden is de tool de
bron, en daarom staat elke handeling in de audit log en kan de tool nooit zonder beheerder komen.

## Beveiliging

- Geef zo weinig mogelijk mensen een beheerdersrol; de rolmatrix op Beheer, Toegang zegt precies
  wat elke rol mag.
- Loop de lijst jaarlijks na (checklist): wie staat erin die het niet meer nodig heeft.
- Een vertrek met haast: toegang afnemen én `AUTH_SECRET` wisselen.

## Kosten

Geen.

## Zo zie je dat het goed staat

- Beheer, Toegang (en bij wachtwoorden Beheer, Accounts) toont iedereen met de rol die je bedoelde.
- Een collega met alleen een gewone rol ziet geen Beheer in de rail en krijgt op `/admin` een 404.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| Iemand heeft een rol gekregen maar ziet niets nieuws | Bij Microsoft: pas na opnieuw inloggen; bij wachtwoord: ververs de pagina |
| Iemand kan nog in terwijl je hem verwijderde | De sessie van acht uur loopt nog; wissel `AUTH_SECRET` als het dringend is |
| "Dit is de laatste beheerder" | Maak eerst iemand anders beheerder |
| De rol staat in Entra maar niet in de tool | De `value` van de app role wijkt af van `project.config.json`; `pnpm entra:status` toont het verschil |

## Vul in

| Wat | Waarde |
|---|---|
| Wie rollen mag toekennen | |
| Datum laatste controle van de lijst | |
