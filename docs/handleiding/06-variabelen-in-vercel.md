<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 06. Variabelen in Vercel

**Wat het is.** Elke dienst geeft je een naam en een waarde; de waarde hoort op precies één plek: in
Vercel, per omgeving. Van daar haalt `vercel env pull` de ontwikkelwaarden naar je `.env.local`.
**Tijd:** twintig minuten, als 03, 04 en 05 klaar zijn.

**Doe dit na** 03, 04 en 05 of 05b. **Daarna kun je** lokaal werken (07) en de eerste deploy doen (08).

## Hoe het scherm werkt

**Settings, Environment Variables** in het Vercel-project. Per variabele: de **Key** exact zoals
hieronder (hoofdletters, liggende streepjes), de **Value** zonder aanhalingstekens en zonder
regelovergang erachter (de meest gemaakte fout bij kopiëren uit een terminal), en de
**Environments** waar hij geldt. Dezelfde key mag meerdere keren bestaan als de omgevingen niet
overlappen: zo krijgt Development een andere database dan Production. Zet **Sensitive** aan bij elk
geheim voor Production en Preview; voor Development staat Vercel dat niet toe, want die waarden haal
je lokaal op met `vercel env pull`. En: een gewijzigde variabele werkt pas in een **nieuwe** deploy.

## De variabelen van de kern

| Key | Production | Preview | Development | Sensitive | Uit |
|---|---|---|---|---|---|
| `DATABASE_URL` | door de Neon-integratie | door de integratie | de pooled string van `dev` | ja | 04 |
| `DATABASE_URL_UNPOOLED` | door de integratie | door de integratie | de direct string van `dev` | ja | 04 |
| `AUTH_SECRET` | waarde A | waarde B | waarde B | ja | hieronder |
| `PRODUCTION_DB_ENDPOINT` | het endpoint-id van productie | dezelfde | nee | nee | 04 |
| `CRON_SECRET` | een hexwaarde | nee | nee | ja | hieronder |
| `AUTH_DEV_LOGIN` | **nooit** | **nooit** | alleen in `.env.local`: `1` | | 07 |
| `SEED_TARGET` | nee | nee | alleen in `.env.local`: het endpoint-id van `dev` | | 07 |

Met inloggen via Microsoft (05) komen erbij, in alle drie de omgevingen:
`AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET` (Sensitive),
`AUTH_MICROSOFT_ENTRA_ID_ISSUER`. De modules hebben hun eigen variabelen: zie 20, 20b, 21 en 22, en
`pnpm template:apply` drukt de volledige lijst af met per variabele de handleiding.

## Stappen

1. Maak twee verschillende waarden voor `AUTH_SECRET`:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`, twee keer. A naar
   Production, B naar Preview en Development samen. Zo kan een sessie uit een preview nooit een
   productiesessie zijn.
   **Controle:** Production en Preview tonen onder de key twee aparte regels.
2. Maak `CRON_SECRET`: `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`.
   Alleen Production; Vercel stuurt hem mee bij elke cronaanroep. Hex, want Vercel wil hier letters
   en cijfers.
   **Controle:** na 08 geeft `pnpm smoke:prod` voor elke cronroute een 404 zonder token.
3. Zet de Development-waarden van `DATABASE_URL` en `DATABASE_URL_UNPOOLED` op de strings van `dev`.
   Laat de Production- en Preview-regels van de integratie met rust: overschrijf je die, dan loopt de
   integratie stuk zodra Neon een branch verplaatst.
   **Controle:** de Development-regel bevat `-pooler` bij de eerste en niet bij de tweede, en beide
   eindigen op `?sslmode=require`.
4. Zet `PRODUCTION_DB_ENDPOINT` voor Production en Preview op het endpoint-id van de productiebranch.
   **Controle:** een preview-deploy slaagt; zonder deze variabele weigert hij met uitleg.
5. Zet de variabelen van je inlogmethode (05) en van de modules die je gebruikt (20 tot 22).
   **Controle:** `pnpm template:apply` drukt de lijst af; elke naam daarin staat in Vercel, behalve
   wat "alleen lokaal" zegt.
6. **Deployments, Redeploy** van de laatste productiedeploy, zodat de variabelen gelden.
   **Controle:** het inlogscherm laadt en Beheer, Systeem (na inloggen) is groen.

## Waarom zo

Eén plek voor geheimen, met een scheiding per omgeving, is het hele verschil tussen "we weten waar
het staat" en "iemand heeft het ooit ergens geplakt". `.env.local` is een afgeleide van Vercel en
geen tweede bron. De dev-login werkt bovendien alleen met `APP_ENV=local` en weigert in elke andere
omgeving te laden, dus zelfs een vergissing kan hem niet in een deploy aanzetten.

## Beveiliging

- Sensitive aan bij elk geheim in Production en Preview: daarna is de waarde niet meer terug te
  lezen, alleen te vervangen. Development kan niet Sensitive; daar staan dan ook geen productiewaarden.
- Nooit een geheim in de chat met Claude, in een document of in een bericht. Alleen de naam.
- Wissel `AUTH_SECRET` als je vermoedt dat een sessie is gelekt; iedereen logt dan opnieuw in.

## Kosten

Geen. Stand van oktober 2026.

## Zo zie je dat het goed staat

- `vercel env pull .env.local` schrijft een bestand met de Development-waarden; `pnpm db:status`
  noemt `dev`.
- Beheer, Systeem is groen; de koppelingen die je niet hebt ingericht staan op "uit" met de namen
  die ontbreken.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| Een deploy ziet een nieuwe waarde niet | Niet opnieuw gedeployd na het wijzigen |
| "invalid URL" of een fout met een `\n` erin | Er is een regelovergang of een aanhalingsteken meegekopieerd in de Value |
| Inloggen werkt lokaal maar niet op productie | De Entra-redirect-URI van productie ontbreekt (05), of `AUTH_SECRET` ontbreekt in Production |
| Een preview migreert productie | `PRODUCTION_DB_ENDPOINT` ontbreekt of staat verkeerd; de guard in `pnpm db:deploy` hoort dit te weigeren |

## Vul in

Geen waarden hier. Noteer alleen de datum waarop je ze zette en wie het deed.
