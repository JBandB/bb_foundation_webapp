<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 30. Beveiliging en kosten in één overzicht

**Wat het is.** Alles wat in de andere handleidingen over beveiliging en kosten staat, bij elkaar,
zodat je het in een kwartier kunt nalopen. Doe dat maandelijks (kosten en vervaldata) en jaarlijks
(accounts en toegang).

## Beveiliging: wat de tool zelf doet

| Wat | Hoe |
|---|---|
| Inloggen | Via Microsoft (rollen uit de tenant) of met wachtwoord plus tweestapsverificatie, vergrendeling na vijf pogingen |
| Rechten | Een matrix in de code; elke mutatie controleert het recht in de server action en het filter zit in de query |
| Sessies | Een JWT van acht uur, getekend met `AUTH_SECRET`; wisselen logt iedereen uit |
| Geheimen | Alleen in Vercel (Sensitive) en `.env.local`; de huisregel weigert een waarde in `.env.example` |
| Database | De app verbindt op productie als de rol van de app (geen DDL, de audit log alleen aanvullen), elke tabel heeft Row Level Security met één regel voor die rol, en `pnpm check:grants` bewijst het |
| Audit | Elke mutatie een regel die nooit meer verandert, met wie, wat, wanneer en vanwaar |
| Server actions | Elke action begint met de sessie, vóór de invoer (huisregel `session-first`); alles wat van buiten te raken is, heeft een rem per adres of per account |
| Buitenkant | Security headers (een CSP met een nonce per verzoek, zodat alleen onze eigen scripts draaien; nosniff; geen framing), cronroutes dicht zonder token, downloads via de server met het recht erbij |
| Mail en bestanden | Tekst van buiten als citaat; de inhoud van een bestand nagekeken voordat hij de opslag in gaat |
| AI | Alleen de velden van een prompt gaan mee, als gegevens; elke aanroep via de server met een recht; de inhoud wordt niet bewaard |
| Dev-login | Alleen lokaal, met `APP_ENV=local`; weigert in elke andere omgeving te laden |
| Sessie | Hoogstens acht uur vanaf het inlogmoment, hoe vaak hij ook ververst wordt |
| Koppelen op e-mail | Alleen een dev-account uit de seed; een tweede identiteit met hetzelfde adres neemt geen account over |

## Beveiliging: wat jij doet

- [ ] Tweestapsverificatie aan op GitHub, Vercel, Neon, Azure en bij de mailaanbieder, voor iedereen.
- [ ] Accounts van de organisatie, niet van een persoon.
- [ ] Zo weinig mogelijk beheerders; de lijst jaarlijks nalopen (11).
- [ ] Vervaldata in de checklist en in de agenda: client secret (05), SAS-token (22), app-wachtwoord
      (20b).
- [ ] Bij een vertrek met haast: toegang afnemen én `AUTH_SECRET` wisselen.
- [ ] Bij een vermoeden van een lek: het betreffende geheim wisselen (06), en in de audit log kijken
      wat er gebeurde.
- [ ] `public/.well-known/security.txt` klopt (het adres waar iemand een lek kan melden).
- [ ] De pull requests van Dependabot meenemen in een ronde, en een rode audit of geheimenscan in de
      CI meteen oppakken (02).
- [ ] `DATABASE_URL_APP` staat op Production en `pg_stat_activity` toont de inlogrol van de app (04).
- [ ] De Data API van Neon staat uit op elke branch. Controle in de SQL Editor: `select relname from
      pg_class where relrowsecurity and relnamespace = 'public'::regnamespace;` noemt elke tabel, en
      `select count(*) from pg_policies where policyname = 'app_rw_all';` evenveel. Een tabel met slot
      en zonder regel is voor de app leeg.
- [ ] Het herstelvenster van Neon is bekend (op Free hoogstens zes uur, stand oktober 2026), en bij
      geld- of personeelsgegevens staat er een tweede kopie buiten Neon.

## Het wachtwoord van de eigenaar draaien

Bij een Neon-project dat via de Vercel Marketplace is afgenomen (de organisatie heet in Neon "Vercel:
..."), beheert de integratie `DATABASE_URL` en `DATABASE_URL_UNPOOLED`, en die zijn met de hand niet te
wijzigen. Twee knoppen lijken bedoeld om het wachtwoord van de eigenaar te draaien en zijn allebei
onveilig gebleken: **gebruik niet Rotate secrets** in Vercel (Storage), die pakt volgens meerdere
meldingen in 2026 de laatst aangemaakte branch in plaats van productie; en **Reset password** in Neon
alleen maakt het oude wachtwoord meteen ongeldig terwijl Vercel het nieuwe niet overneemt. Zo wel:

1. Neon, **Connect**, de productiebranch, rol `neondb_owner`, **Connection pooling uit** (de host
   heeft dan geen `-pooler`), kopiëren. Vercel, Settings, Environment Variables, **alleen
   Production**, Sensitive: `DATABASE_URL_OWNER` = die string, met het huidige wachtwoord.
   **Redeploy** productie.
   **Controle:** het buildlog toont "Migreren vanuit omgeving production naar endpoint ep-..." met het
   endpoint van productie en de deploy slaagt. Wijst de string naar een andere branch, dan weigert
   `db:deploy` met "Er is niets gemigreerd".
2. Neon, **Roles**, de productiebranch, bij `neondb_owner` **Reset password**. Kopieer het nieuwe
   wachtwoord meteen.
3. Vercel, `DATABASE_URL_OWNER` (Production): vervang het wachtwoord (tussen de dubbele punt na
   `neondb_owner` en de `@`). **Redeploy** productie, en dezelfde controle als in stap 1.
4. Wat daarna niet meer klopt, en niet erg is: de twee variabelen van de integratie op Production
   houden het oude wachtwoord, maar in productie leest niets ze meer. De app gebruikt
   `DATABASE_URL_APP`, de migraties `DATABASE_URL_OWNER`. Controleer bij de eerstvolgende pull request
   of de preview nog bouwt.

Buiten productie telt `DATABASE_URL_OWNER` niet, ook niet als iemand hem per ongeluk zet: een vaste
waarde zou anders elke preview en elk script op productie zetten. `pnpm doctor` zegt het als hij in
`.env.local` staat.

## Kosten: waar het plafond staat

| Dienst | Plan tijdens het bouwen | Plan met gebruikers | Waar het plafond staat | Wat de rekening maakt |
|---|---|---|---|---|
| GitHub | Free | Free (Team alleen voor branch protection) | Actions-uitgavenlimiet op nul | niets, bij dit gebruik |
| Vercel | Hobby | Pro met Spend Management | Spend Management, een hard bedrag | seats, bouwminuten, functietijd |
| Neon | Free | Free of Launch | het plan; autosuspend en minimum compute | compute die wakker blijft, schrijfvolume, branches |
| Azure (opslag) | pay as you go | pay as you go | een budget met waarschuwing op de resource group | opslag en transacties, centen |
| Mailaanbieder | gratis plan | gratis of laagste | het plan zelf | volume |
| Claude API | tegoed vooraf | tegoed vooraf | de uitgavenlimiet op de workspace, automatisch bijkopen uit, en de daglimiet per persoon in de tool | tokens per verzoek, nadenken telt als output |
| Microsoft 365 | bestaand | bestaand | niet van toepassing | niets extra |

Geen bedragen hier: die veranderen. Het bedrag per dienst uit je eigen budget staat in je checklist
(tabel Budget), met de datum erbij.

## Kosten: wat jij doet

- [ ] Maandelijks de rekening per dienst tegen het plafond uit je checklist.
- [ ] Bij Neon: autosuspend kort, minimum compute laag, oude branches weg (04).
- [ ] Bij de Claude API: het verbruik onder Beheer, AI tegen de Console, en de prijzen nog actueel (24).
- [ ] Bij Vercel: geen preview zonder pull request; Web Analytics en Observability uit als je ze niet
      gebruikt (03).
- [ ] Zodra er echte gebruikers zijn: Vercel naar Pro met Spend Management, en de wachtrijcrons naar
      elk kwartier (23).
- [ ] Een weggelopen rekening is bijna altijd een vergeten plafond of een compute die niet slaapt.

## Vul in

| Wat | Waarde |
|---|---|
| Datum laatste maandelijkse controle | |
| Datum laatste jaarlijkse controle | |
| Wie dit doet | |
