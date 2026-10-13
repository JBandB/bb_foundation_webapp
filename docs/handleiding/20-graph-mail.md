<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 20. Mail via Microsoft Graph

**Wat het is.** De tool verstuurt mail uit een gedeelde postbus van Microsoft 365, met de
app-registratie van de inlog. Voor een project met de module messaging en `messaging.transport`
op `graph`. **Tijd:** een half uur, plus een uur wachten tot Exchange de beperking overal kent.

**Doe dit na** 05 en 06. **Daarna kun je** een proefmail sturen en de uitnodigingen, herinneringen
en meldingen laten lopen. Geen Microsoft 365: volg 20b.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| De app-registratie uit 05 | Het token komt van dezelfde registratie | |
| Exchange Administrator of Global Administrator | Een gedeelde postbus en de beperking | |
| Privileged Role Administrator of Global Administrator | Admin consent voor `Mail.Send` | |
| PowerShell met de module ExchangeOnlineManagement | Voor de beperking tot één postbus | |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een gedeelde postbus | `<slug>@<domein>`, weergavenaam de naam van je project | `GRAPH_SENDER_UPN` |
| Het applicatierecht `Mail.Send` met consent | | nergens |
| Een mail-enabled security group met alleen die postbus, en een ApplicationAccessPolicy | `<slug>-afzender` | nergens |

## Stappen

1. In het Microsoft 365-beheercentrum: **Teams en groepen, Gedeelde postvakken, Een gedeeld postvak
   toevoegen**. Naam: de naam van je project; adres: de slug. Geen licentie nodig; het account
   eronder kan niet inloggen. Zet de weergavenaam recht als er een tijdstempel achter kwam, en voeg
   jezelf toe als lid: op een melding komt vroeg of laat een antwoord.
   **Controle:** het adres bestaat en jij ziet de postbus in Outlook.
2. In de app-registratie: **API permissions, Add a permission, Microsoft Graph, Application
   permissions**, `Mail.Send`, **Add**. Daarna **Grant admin consent**.
   **Controle:** een groen vinkje bij `Mail.Send` onder Status.
3. Beperk het recht tot die ene postbus. `Mail.Send` als applicatierecht mag anders namens iedere
   postbus in de tenant mailen. In PowerShell:

   ```powershell
   Install-Module ExchangeOnlineManagement -Scope CurrentUser
   Connect-ExchangeOnline -UserPrincipalName <jouw adres>
   New-DistributionGroup -Name "<slug>-afzender" -Alias "<slug>-afzender" -PrimarySmtpAddress "<slug>-afzender@<domein>" -Type Security -Members "<slug>@<domein>"
   Set-DistributionGroup -Identity "<slug>-afzender@<domein>" -HiddenFromAddressListsEnabled $true -RequireSenderAuthenticationEnabled $true
   New-ApplicationAccessPolicy -AppId "<client-id>" -PolicyScopeGroupId "<slug>-afzender@<domein>" -AccessRight RestrictAccess -Description "Alleen de postbus van de tool"
   ```

   De groep moet een mail-enabled **security** group zijn; de postbus zelf, een distributielijst of
   een Microsoft 365-groep wordt geweigerd.
   **Controle:** `Get-ApplicationAccessPolicy | Format-List AppId, ScopeName, AccessRight` toont de
   regel. `Test-ApplicationAccessPolicy` zegt niets als er geen regel is, dus kijk naar de lijst.
4. Zet `GRAPH_SENDER_UPN` in Vercel (alle omgevingen) en in `.env.local`, en deploy opnieuw.
   **Controle:** Beheer, Systeem toont "Mail en meldingen" niet meer als "niet ingericht".
5. `pnpm mail:test -- <jouw adres>`: eerst de handdruk (een token), dan één proefmail.
   **Controle:** de mail komt aan, met de naam van je project als afzender; kijk ook in de spammap.

## Waarom zo

Een gedeelde postbus heeft geen licentie en geen wachtwoord dat kan lekken. Het applicatierecht is
nodig omdat er geen mens ingelogd is als de tool mailt (een cron, een ronde na een handeling). De
beperking tot één postbus is geen netheid: zonder die regel mag de tool namens de directeur mailen,
en dat recht hoort niemand te hebben.

## Beveiliging

- De ApplicationAccessPolicy is het slot; controleer hem na het aanmaken en na elke wijziging aan de
  app-registratie.
- Het client secret is hetzelfde als dat van de inlog (05); verloopt het, dan stopt ook de mail.
- Antwoorden op meldingen komen in de gedeelde postbus; iemand hoort die te lezen.

## Kosten

Geen; onderdeel van Microsoft 365. Stand van oktober 2026.

## Zo zie je dat het goed staat

- `pnpm mail:test` levert een mail op en Beheer, Systeem zegt "Microsoft Graph: 0 in de rij".
- Een uitnodiging (05b) of een melding komt binnen een minuut aan.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| "Token ophalen bij Entra mislukte" | Het client secret is verlopen of de issuer bevat `common` in plaats van de tenant-id |
| Graph status 403 bij versturen | Geen admin consent voor `Mail.Send`, of de ApplicationAccessPolicy sluit de postbus uit (verkeerde groep) |
| Graph status 404 op de postbus | `GRAPH_SENDER_UPN` is niet het exacte adres van de gedeelde postbus |
| De mail komt in de spam | De afzender is een nieuw adres; dat trekt bij, en SPF en DKIM van het domein staan goed omdat Microsoft 365 ze beheert |
| Berichten blijven "wacht" op Beheer, Berichten | Het transport is niet ingericht; de kolom ontbrekende variabelen staat op Beheer, Systeem |

## Vul in

| Wat | Waarde |
|---|---|
| Gedeelde postbus | |
| Security group | |
| Datum consent en policy | |
