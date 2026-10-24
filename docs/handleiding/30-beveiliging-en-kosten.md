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
| Audit | Elke mutatie een regel die nooit meer verandert, met wie, wat, wanneer en vanwaar |
| Buitenkant | Security headers (CSP, nosniff, geen framing), cronroutes dicht zonder token, downloads via de server met het recht erbij |
| Mail en bestanden | Tekst van buiten als citaat; de inhoud van een bestand nagekeken voordat hij de opslag in gaat |
| AI | Alleen de velden van een prompt gaan mee, als gegevens; elke aanroep via de server met een recht; de inhoud wordt niet bewaard |
| Dev-login | Alleen lokaal; weigert te laden zodra `VERCEL_ENV` bestaat |

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
