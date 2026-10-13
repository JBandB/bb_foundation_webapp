<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Lessen: Entra ID en Microsoft Graph

De Microsoft-kant: de app-registratie, de tenant, app roles, secrets, mail via Graph, en
koppelingen namens een gebruiker. Alleen van toepassing in een project met module auth-entra of met
Graph als mailtransport. De vorm van elke les staat in [README.md](README.md).

## L-ENTRA-01 De issuer bepaalt de tenant

**Symptoom.** (voorkomen) Zonder issuer mag ieder Microsoft-account inloggen. Een losse
tenant-id-variabele bleek door de geïnstalleerde provider niet gebruikt te worden.

**Oorzaak.** De Entra-provider van Auth.js valt zonder `AUTH_MICROSOFT_ENTRA_ID_ISSUER` terug op
`/common/`.

**Regel.** `AUTH_MICROSOFT_ENTRA_ID_ISSUER = https://login.microsoftonline.com/<tenant-id>/v2.0`,
zonder slash aan het eind, verplicht. Graph-code leidt de tenant uit diezelfde issuer af in plaats
van een tweede variabele die kan afwijken, en weigert `common` en `organizations` (geen tenant, dus
geen client credentials). Single tenant registreren, implicit grant en hybrid flows uit.

**Afgedwongen door.** `lib/auth/providers/entra.ts` (weigert te starten zonder issuer),
`tenantFromIssuer` in het Graph-transport van module messaging, en `pnpm entra:status`. De
registratie-instellingen zijn afspraak, zie `docs/handleiding/05-entra.md`.

## L-ENTRA-02 Toegang geef en neem je in de enterprise application

**Symptoom.** Zonder schakelaar kon iedereen in de tenant inloggen met een lege rollenclaim. Een
gebruiker in de database op inactief zetten deed niets voor de rollen.

**Oorzaak.** "Assignment required?" staat standaard uit, en rollen worden toegewezen onder
Enterprise applications, niet in de app registration: de stap die het vaakst wordt overgeslagen.
Autorisatie leest de claim, niet de database.

**Regel.** "Assignment required" op Yes: Entra weigert dan al (AADSTS50105) voordat de app iets
ziet. Rollen per persoon onder Enterprise applications, Users and groups. Iemand eruit halen is de
toewijzing weghalen; moet het direct, dan zet je hem in de tool op inactief (de controle per
request uit L-AUTH-03) of wissel je `AUTH_SECRET`. De gebruikersrij laten staan, want daar hangt
historie aan.

**Afgedwongen door.** Een instelling in Entra, dus afspraak; `docs/handleiding/11-toegang-beheren.md`
beschrijft de klikroute. `pnpm entra:status` toont of de toewijzing verplicht is.

## L-ENTRA-03 Bij app roles telt alleen de value

**Symptoom.** Iemand logt in zonder rechten en niets wijst naar de oorzaak. In de manifest staan
andere GUID's dan in de documentatie.

**Oorzaak.** Een ontbrekende of anders gespelde rol geeft geen fout maar een lege claim. De GUID is
administratie binnen Entra en verschilt per manier van aanmaken.

**Regel.** De code vergelijkt alleen de value, exact gelijk aan de rolnaam in `project.config.json`.
Bij een lege registratie via de manifest, daarna alleen via de knoppen (Entra weigert een
toegewezen rol te wijzigen). Geen optional claim voor rollen: toegewezen app roles staan vanzelf in
het token. Een leesscript dat de rollen in Entra naast de code legt.

**Afgedwongen door.** `pnpm entra:status` (leest alleen; vergelijkt `APP_ROLES` met de tenant) en
`parseRoles` in `lib/auth/roles.ts`, dat onbekende waarden weggooit.

## L-ENTRA-04 Redirect-URI's moeten teken voor teken kloppen

**Symptoom.** AADSTS50011 na een domeinwissel. Mails wezen na het koppelen van een eigen domein nog
naar het `.vercel.app`-adres.

**Oorzaak.** Entra kent geen wildcards en vergelijkt exact. `VERCEL_PROJECT_PRODUCTION_URL` wordt
per deployment ingebakken en verandert pas bij de volgende deploy.

**Regel.** Per omgeving een redirect-URI: localhost (http mag alleen daar), het productiedomein, het
vaste branch-alias van `main`. Voor previews per branch-alias, of één vaste previewhost. Eigen
domein vroeg kiezen. Na een domeinwissel de URI toevoegen en één keer redeployen. Voor een eigen
OAuth-flow de basis-URL expliciet zetten, zodat registratie en code hetzelfde adres hebben.

**Afgedwongen door.** Alleen afspraak; de lijst staat in `docs/handleiding/05-entra.md`.

## L-ENTRA-05 Een client secret: de Value, en een datum in de agenda

**Symptoom.** (voorkomen) Een verlopen secret betekent dat niemand meer inlogt, op een willekeurige
ochtend twee jaar later. De Secret ID werd aangezien voor het secret.

**Oorzaak.** De Value is alleen direct na aanmaken te zien. De Secret ID is ook een GUID en lijkt op
een waarde.

**Regel.** De Value meteen kopiëren (circa veertig tekens met punten en tildes); kwijt is een nieuwe
maken. Looptijd 24 maanden en de vervaldatum met een herinnering in de agenda. Vervaldatums van
tokens als niet-geheime variabelen naast het token, zodat Beheer, Systeem dertig dagen vooraf
waarschuwt.

**Afgedwongen door.** Beheer, Systeem via `lib/integrations/health.ts` voor tokens met een
datumvariabele (module files doet dat met `BLOB_SAS_EXPIRES`). Voor het client secret alleen
afspraak en de tabel Vervaldata in de checklist.

## L-ENTRA-06 `Mail.Send` als application permission mag elke postbus

**Symptoom.** (voorkomen) De applicatie kon namens iedereen in de tenant mailen. De controle zei
"Granted" terwijl er niets was ingesteld.

**Oorzaak.** Application permissions gelden tenantbreed. `Test-ApplicationAccessPolicy` geeft
"Granted" zolang er voor die AppId helemaal geen policy bestaat.

**Regel.** Inperken met `New-ApplicationAccessPolicy -AccessRight RestrictAccess` op een
mail-enabled security group met alleen de afzenderpostbus; de gedeelde postbus zelf, een
distributielijst of een Microsoft 365-groep wordt als scope geweigerd. Controleren met
`Get-ApplicationAccessPolicy` en de echte proef: `sendMail` namens de afzender geeft 202, namens een
andere postbus 403. Reken op tot een uur. Een policy geldt per applicatie en niet per permissie, dus
een andere scope (zoals agenda) krijgt een eigen app registration. Afzender: gedeelde postbus met
nette weergavenaam, jezelf als lid voor antwoorden.

**Afgedwongen door.** Alleen afspraak plus de handmatige proef, zie `docs/handleiding/20-graph-mail.md`.

## L-ENTRA-07 App-tokens en Graph-antwoorden

**Symptoom.** Honderd mails in een ronde waren honderd tokenaanvragen. Na het verlenen van admin
consent bleef een cron tot een uur 403 krijgen. Een dubbele roltoewijzing liet een verzoek stranden
terwijl alles klopte.

**Oorzaak.** Zonder cache vraagt elke aanroep een nieuw token. Een client-credentials-token draagt
de permissies van het moment van uitgifte. Graph geeft bij "bestaat al" soms 409, soms 400 met
"already exist" in de melding.

**Regel.** Token per warme instantie cachen, gesleuteld op client-id, met vijf minuten marge. Bij
401 of 403 precies één herkansing met een vers token. "Bestaat al" (409, of 400 met die tekst) is
de gewenste eindtoestand; bij `DELETE` is 404 een succes. De reden uit de body lezen en in de
foutmelding zetten, met een hint welke permissie waarschijnlijk ontbreekt. Een hele-dag-afspraak
heeft een exclusief einde en tijden gaan met een expliciete `timeZone`. Elke aanroep met timeout
(L-VRC-04).

**Afgedwongen door.** Het Graph-transport van module messaging (`lib/messaging/transport/graph.ts`:
tokencache, één herkansing, `fetchWithTimeout`). De rest is patroon voor wie meer van Graph
gebruikt (`rollen-schrijven-naar-entra`).

## L-ENTRA-08 Delegated OAuth met refresh tokens

**Symptoom.** Twee tabbladen draaiden het refresh token tegen elkaar in. (Voorkomen:) zonder
`offline_access` werkt een koppeling alleen zolang iemand op het scherm staat, en een koppeling die
het nieuwe refresh token niet bewaart, stopt na een tijd stil.

**Oorzaak.** Zonder `offline_access` geen refresh token. Microsoft geeft bij elke verversing een
nieuw refresh token en het oude kan vervallen. Elk scherm dat zelf ververst, concurreert.

**Regel.** Scope `offline_access` plus wat je nodig hebt, delegated: de gebruiker geeft zelf
toestemming en kan die intrekken. Bij elke verversing het nieuwe refresh token opslaan. Het access
token versleuteld bewaren tot kort voor het verloopt en hergebruiken. `state` ondertekenen (HMAC,
met vervaltijd, timing-safe vergeleken) en in de callback controleren dat de starter dezelfde is
als de ingelogde gebruiker. `prompt=consent` bij opnieuw verbinden. Tokens versleuteld at rest
(AES-256-GCM). AADSTS65001 is geen toestemming, een 401 in de ronde is ingetrokken: laat de
gebruiker dat zien.

**Afgedwongen door.** Niets in het template: er is geen delegated koppeling in de kern. Wie er een
bouwt, neemt deze les als checklist en gebruikt de secret-box van module auth-password voor de
versleuteling.

## L-ENTRA-09 Externe gasten uitnodigen en mailen zonder dat het op phishing lijkt

**Symptoom.** Uitnodigingsmails kwamen niet aan. Bestaande gasten moesten na een her-uitnodiging
opnieuw een authenticator registreren. Een browser met een oud account logde stil in als het
verkeerde account. Een ontvanger vond de mail onbetrouwbaar.

**Oorzaak.** Een mail met een rauwe `login.microsoftonline.com/redeem`-link is precies waar
spamfilters op letten. Een invitation voor iemand die al gast is heeft geen doel en zet zijn MFA
terug. Zonder accountkeuze pakt Microsoft het account dat al in de browser zit. Platte tekst met een
lange safelink onder de externe-afzenderbanner van Outlook ziet eruit als phishing.

**Regel.** Invitation met `sendInvitationMessage: false`, en een eigen mail met een link naar het
eigen domein (just-in-time redemption bij het inloggen); de redeem-URL bewaren voor een handmatig
geval. Een bestaande gast (echt object-id) niet opnieuw uitnodigen, alleen de rol zekerstellen en
mailen. Voor gasten `signIn(provider, { redirectTo }, { prompt: "select_account" })`. HTML-mail als
tabel met inline stijlen (Outlook op Windows rendert met Word), een knop in plaats van een kale URL,
tekst van buiten altijd escapen. Graph `sendMail` neemt één contentType, geen multipart.

**Afgedwongen door.** `lib/messaging/mail-html.ts` van module messaging (tabel, inline stijlen,
escapen) met zijn test. Het gastenverhaal zelf hoort bij de gereserveerde module portal.
