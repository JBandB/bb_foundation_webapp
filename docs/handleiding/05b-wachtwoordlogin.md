<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 05b. Wachtwoordlogin en tweestapsverificatie

**Wat het is.** Eigen accounts in de tool, voor een organisatie zonder Microsoft 365-tenant: een
beheerder nodigt uit, de persoon kiest een wachtwoord, en voor beheerders is tweestapsverificatie
verplicht. **Tijd:** een kwartier voor de eerste beheerder; daarna een minuut per collega.

**Doe dit na** 06 en 07 (de tool draait en kan mailen, of je gebruikt de koppeling op het scherm).
**Daarna kun je** collega's uitnodigen op Beheer, Accounts. Is er wel een tenant, kies dan 05:
inloggen via Microsoft heeft de voorkeur, omdat toegang afnemen dan gebeurt waar het hoort.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| `auth.provider` op `password` in `project.config.json` en de module `auth-password` toegepast | Dan bestaan de schermen en de tabellen | |
| De module messaging ingericht (20 of 20b), of geduld tot dan | Uitnodigingen en herstelkoppelingen gaan per mail; de eerste beheerder en het instellen van tweestapsverificatie kunnen zonder | |
| Een authenticator-app op je telefoon | Verplicht voor beheerders | |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Het account van de eerste beheerder | jouw naam en adres | de tabel `users`, via `pnpm invite` |
| In Vercel `MFA_SECRET_KEY`, gelijk in Production en Preview (maak hem zoals `AUTH_SECRET` in 06, stap 1) | Het geheim van tweestapsverificatie staat daarmee versleuteld. Zonder valt het terug op `AUTH_SECRET`, en dat verschilt per omgeving, dus dan werkt tweestap niet op een preview (09) | |

## Stappen

1. Maak het account aan op de database waar je gaat inloggen. Je `.env.local` wijst naar de
   dev-branch (07), dus `pnpm invite` maakt het account daar aan: goed voor lokaal werken, maar op je
   eigen webadres bestaat het dan niet. Voor je live tool doe je het zo:
   - Maak in de hoofdmap een tijdelijk bestand `.env.eerste-account` (git negeert elk `.env`-bestand)
     met twee regels: `DATABASE_URL=` met de verbindingsstring van de **productiebranch** uit de
     Neon-console, en `AUTH_URL=` met je eigen webadres, bijvoorbeeld `https://mijn-tool.vercel.app`.
   - Draai in de terminal:
     `node --env-file=.env.eerste-account node_modules/tsx/dist/cli.mjs scripts/invite.ts -- <jouw adres> "<jouw naam>"`
     (zonder rol krijg je de eerste beheerdersrol).
   - Verwijder `.env.eerste-account` meteen daarna. Plak de verbindingsstring nooit in de chat.

   Het script maakt het account aan en drukt een koppeling af die zeven dagen geldig is.
   **Controle:** het script toont het adres, de rollen en één koppeling, en de koppeling begint met
   je eigen webadres. De koppeling is het geheim: deel hem met niemand.
2. Open de koppeling in de browser en kies een wachtwoord: minstens twaalf tekens. Een zin die je
   onthoudt is beter dan een moeilijk woord.
   **Controle:** "Je account is klaar." en daarna het inlogscherm.
3. Log in met adres en wachtwoord. Omdat je beheerder bent, ga je meteen door naar de pagina
   "Tweestapsverificatie instellen". Scan de QR-code met je app en vul de code van zes cijfers in.
   Je hebt hiervoor geen mail nodig. De pagina is een kwartier geldig; is hij verlopen, log dan
   gewoon opnieuw in.
   **Controle:** "Tweestapsverificatie staat aan." Log opnieuw in: adres, wachtwoord, en daarna de code.
4. Nodig collega's uit op **Beheer, Accounts** met het plusje Uitnodigen: naam, adres, rollen. Ze
   krijgen een mail met hun koppeling.
   **Controle:** de collega staat in de lijst als "uitgenodigd" en na het kiezen van een wachtwoord als
   "actief".
5. Zet in je checklist wie accounts mag uitnodigen en wie ingrijpt bij een vermoeden van misbruik.

## Waarom zo

Wachtwoorden zijn de zwakste vorm van inloggen, en daarom staan er vier sloten omheen. **Geen
zelfregistratie**: alleen een uitnodiging door een beheerder. **Tweestapsverificatie** voor wie
veel mag (standaard beheerders; `auth.password.mfaRequiredFor` kan op iedereen). **Vergrendeling**
na vijf foute pogingen op een account of vanaf één adres, een kwartier lang, met één foutmelding die
niet verraadt of een adres bestaat. **Eenmalige koppelingen** met een korte geldigheid voor
uitnodigen, herstellen en het instellen van tweestapsverificatie; de database kent alleen een
vingerafdruk van de koppeling.

Het instellen van tweestapsverificatie gaat direct na een juist wachtwoord, zonder mail. Vroeger
kwam daar een koppeling voor per mail, en zonder ingerichte mail kon de eerste beheerder dan niet
verder: het bericht stond in Beheer, Berichten, en daar kom je pas na inloggen. Nu controleert de
tool het wachtwoord en opent hij meteen de pagina met de QR-code, met een eenmalige koppeling die
een kwartier geldig is. Wie het wachtwoord niet kent, komt daar niet.

Een beheerder kan zijn eigen account niet deactiveren en de laatste beheerder kan zijn rol niet
verliezen, zodat de tool nooit zonder beheerder komt te zitten.

## Beveiliging

- Draait `AUTH_SECRET` in Vercel, dan is iedereen uitgelogd. Draait `MFA_SECRET_KEY` (of
  `AUTH_SECRET` als `MFA_SECRET_KEY` ontbreekt), dan moet iedereen tweestapsverificatie opnieuw
  instellen: het geheim van de app staat versleuteld met een sleutel daaruit. Doe dat bewust.
- Zet je `MFA_SECRET_KEY` later pas, dan hoeft niemand opnieuw in te stellen: bij de volgende inlog
  zet de tool het geheim vanzelf om naar de nieuwe sleutel.
- Bij een vermoeden van misbruik: op Beheer, Accounts het account deactiveren (het kan dan niet
  meer inloggen), tweestapsverificatie resetten als de telefoon weg is, en een herstelkoppeling sturen
  als het wachtwoord gelekt kan zijn. Alles staat in de audit log.
- Een wachtwoord staat nergens leesbaar, ook niet voor een beheerder; een beheerder kan het alleen
  laten herstellen.

## Kosten

Geen. Stand van oktober 2026.

## Zo zie je dat het goed staat

- Beheer, Accounts toont elk account met status (uitgenodigd, actief, inactief, vergrendeld) en of
  tweestapsverificatie aan staat.
- `pnpm check:auth-password` is groen op de dev-branch.
- Een vijfde fout wachtwoord geeft dezelfde melding als het eerste, en in de lijst staat het account
  een kwartier op "vergrendeld".

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| "Inloggen is niet gelukt" terwijl het wachtwoord klopt | Het account is vergrendeld (een kwartier), inactief, of heeft tweestapsverificatie aan en de code ontbreekt (het codeveld verschijnt dan) |
| Geen mail met de uitnodiging | Mail is niet ingericht of het bericht wacht: Beheer, Berichten toont het, en een beheerder kan de uitnodiging opnieuw sturen |
| "Deze stap is verlopen of al afgerond" op de pagina met de QR-code | Er zat meer dan een kwartier tussen inloggen en de code invullen, of de stap is al gedaan. Log opnieuw in: je komt weer bij de QR-code, of je krijgt het codeveld als het al aan staat |
| Een code wordt steeds geweigerd | De klok van de telefoon loopt af; zet tijd op automatisch |
| De enige beheerder is zijn telefoon kwijt | Een tweede beheerder reset zijn tweestapsverificatie; is er geen tweede, dan `pnpm invite` voor een nieuw beheerdersaccount en daarna het oude resetten |

## Vul in

| Wat | Waarde |
|---|---|
| Eerste beheerder | |
| Wie mag uitnodigen | |
| Wie grijpt in bij misbruik | |
| Tweestapsverificatie verplicht voor | |
| Datum ingericht | |
