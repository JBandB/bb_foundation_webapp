<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 05. Microsoft Entra: inloggen met het Microsoft-account

**Wat het is.** Een app-registratie in de Microsoft 365-tenant van de organisatie, zodat collega's
inloggen met het account dat ze al hebben en de rollen uit de tenant komen. **Tijd:** een half uur,
plus wachten op een beheerder als jij dat niet bent.

**Doe dit na** 03 (je kent het productieadres). **Daarna kun je** de variabelen zetten (06) en
rollen toekennen (11). Heeft de organisatie geen tenant, sla dit over en volg 05b.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Application Administrator of Global Administrator in de tenant | Een app registreren en app roles aanmaken | |
| Het productieadres uit 03 en eventueel een eigen domein | De redirect-URI moet er exact op matchen | |
| De rolwaarden uit `project.config.json` (`auth.roles[].value`) | De app roles krijgen exact die waarden | |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een app-registratie | de naam van je project | `AUTH_MICROSOFT_ENTRA_ID_ID` (de client-id) |
| Een client secret | de naam van je project plus het jaar | `AUTH_MICROSOFT_ENTRA_ID_SECRET`, Sensitive |
| De tenant-id | staat op Overview | `AUTH_MICROSOFT_ENTRA_ID_ISSUER` als `https://login.microsoftonline.com/<tenant-id>/v2.0` |
| App roles | exact de waarden uit de configuratie | nergens: de tool vergelijkt de tekst in het token |

## Stappen

1. portal.azure.com, **Microsoft Entra ID, App registrations, New registration**. Naam: je project.
   Supported account types: **Single tenant**. Redirect URI: platform **Web**,
   `http://localhost:3000/api/auth/callback/microsoft-entra-id`. **Register**.
   **Controle:** de Overview toont een Application (client) ID en een Directory (tenant) ID.
2. **Authentication, Web, Add URI**: `https://<productieadres>/api/auth/callback/microsoft-entra-id`,
   en hetzelfde voor een eigen domein als dat er is. Laat Implicit grant uit.
   **Controle:** elke URI staat er letterlijk, met `https` en zonder slash aan het eind.
3. **Certificates & secrets, New client secret**: omschrijving met het jaar, geldig **24 maanden**.
   Kopieer de **Value** meteen (niet de Secret ID): hij is daarna niet meer te zien. Zet de
   vervaldatum in je checklist en in je agenda, een maand ervoor.
   **Controle:** de waarde staat in je wachtwoordmanager, nergens anders.
4. **App roles, Create app role**, één per rol uit `project.config.json`: Display name het label,
   Allowed member types **Users/Groups**, **Value** exact de `value` (kleine letters, geen spaties),
   Enabled aan.
   **Controle:** de lijst app roles heeft precies de waarden uit de configuratie. `pnpm entra:status`
   vergelijkt ze (na 07).
5. **Enterprise applications**, zoek je project, **Properties**: **Assignment required** op **Yes**.
   **Controle:** zonder deze schakelaar kan iedereen in de tenant inloggen zonder rol; met de
   schakelaar weigert Microsoft de login voordat de tool iets ziet.
6. Dezelfde plek, **Users and groups, Add user/group**: geef jezelf de beheerdersrol. Zie 11 voor
   de rest.
   **Controle:** na 06 en 07 kun je lokaal inloggen en zie je Beheer in de rail.
7. **API permissions**: `openid`, `profile`, `email`, `User.Read` staan er standaard. Voeg nu niets
   toe; `Mail.Send` komt pas bij handleiding 20 als de module messaging via Graph mailt.
   **Controle:** geen rode melding over ontbrekende consent.

## Waarom zo

De rollen leven in de tenant, zodat toegang afnemen daar gebeurt waar HR het al doet: iemand die uit
de organisatie gaat, verliest zijn Microsoft-account en daarmee de toegang. De tool leest alleen; een
vinkje in de database doet niets. De identiteit is het object-id uit het token en niet het e-mailadres,
want adressen veranderen. "Assignment required" is de schakelaar die het verschil maakt tussen
"iedereen met een account" en "wie een rol heeft".

## Beveiliging

- Het client secret verloopt. Zonder nieuw secret kan op die dag niemand inloggen. Agenda.
- Iemand toegang afnemen: verwijder de toewijzing in Enterprise applications, Users and groups. De
  sessie van acht uur loopt nog af; moet het meteen, wissel dan `AUTH_SECRET` in Vercel (dan is
  iedereen uitgelogd).
- Geen wildcards in redirect-URI's; per adres een regel.

## Kosten

Geen. Een app-registratie is onderdeel van Microsoft 365. Stand van oktober 2026.

## Zo zie je dat het goed staat

- Inloggen op het productieadres brengt je naar Microsoft en terug, en de rail toont je naam.
- `pnpm entra:status` zegt dat de app roles in de tenant gelijk zijn aan `APP_ROLES`.
- Een collega zonder toewijzing krijgt van Microsoft een melding dat de app niet voor hem is.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| AADSTS50011, redirect URI mismatch | Het adres staat niet letterlijk onder Authentication; let op https, het pad en de slash |
| AADSTS700016 of "application not found" | De client-id in Vercel is de Secret ID of een andere GUID; neem Application (client) ID |
| Inloggen lukt, maar "geen toegang" of een lege rol | Geen app role toegewezen, of de value in Entra wijkt af van de configuratie |
| Inloggen lukt voor iedereen in de tenant | Assignment required staat op No |
| Opeens kan niemand meer inloggen | Het client secret is verlopen; maak een nieuw en zet het in Vercel |

## Vul in

| Wat | Waarde |
|---|---|
| Naam van de app-registratie | |
| Tenant | |
| Client secret verloopt op | |
| Wie Application Administrator is | |
| Datum aangemaakt | |
