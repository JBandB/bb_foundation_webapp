<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 20b. Mail via SMTP

**Wat het is.** De tool verstuurt mail via een gewone mailaanbieder met SMTP: een gebruikersnaam en
een wachtwoord (of app-wachtwoord) op een server. Voor een project met de module messaging en
`messaging.transport` op `smtp`, meestal omdat er geen Microsoft 365 is. **Tijd:** een half uur, plus
de tijd die de aanbieder nodig heeft om het domein te bevestigen.

**Doe dit na** 06. **Daarna kun je** een proefmail sturen.

## Nodig

| Nodig | Waarom | Heb je dat |
|---|---|---|
| Een mailaanbieder met SMTP voor transactionele mail (Postmark, Resend, Mailgun, Brevo, of de eigen hostingpartij) | De server die verstuurt | |
| Beheer over de DNS van het afzenderdomein | SPF en DKIM instellen, anders is het spam | |
| Een afzenderadres op dat domein | Wat de ontvanger ziet | |

## Wat je aanmaakt

| Wat | Naam | Waar de waarde heen gaat |
|---|---|---|
| Een account bij de aanbieder, op het adres van de organisatie | | nergens |
| Een afzenderdomein of een afzenderadres, bevestigd met DNS | je domein | `SMTP_FROM` als `Naam <adres@domein>` |
| SMTP-gegevens: server, poort, gebruikersnaam, wachtwoord | | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD` (Sensitive) |

## Stappen

1. Maak het account bij de aanbieder aan met het adres van de organisatie en zet tweestapsverificatie
   aan. Kies het gratis of laagste plan; het volume van een interne tool past daarin.
   **Controle:** je kunt inloggen; de aanbieder vraagt om een domein of een afzender te bevestigen.
2. Voeg het afzenderdomein toe en zet de DNS-records die de aanbieder geeft: **SPF** (een TXT-record
   dat de aanbieder als afzender toestaat), **DKIM** (een of meer CNAME- of TXT-records) en, als het
   kan, **DMARC** (`v=DMARC1; p=quarantine` op `_dmarc`).
   **Controle:** de aanbieder toont het domein als geverifieerd; dat kan een uur duren.
3. Haal de SMTP-gegevens op: server, poort (587 met STARTTLS is de standaard; 465 is SMTPS), een
   gebruikersnaam en een wachtwoord of app-wachtwoord dat alleen voor deze tool is.
   **Controle:** het wachtwoord staat in je wachtwoordmanager, nergens anders.
4. Zet in Vercel (alle omgevingen) en in `.env.local`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
   `SMTP_PASSWORD` (Sensitive), `SMTP_FROM` als `Naam van je project <adres@domein>`. Deploy opnieuw.
   **Controle:** Beheer, Systeem toont "Mail en meldingen" met SMTP en zonder ontbrekende variabelen.
5. `pnpm mail:test -- <jouw adres>`: eerst de handdruk met de server, dan één proefmail.
   **Controle:** de mail komt aan, in de inbox en niet in de spam. Komt hij in de spam, dan kloppen
   SPF of DKIM nog niet.

## Waarom zo

SMTP werkt overal en vraagt geen tenant. De prijs is een wachtwoord dat kan lekken: daarom een eigen
account met tweestapsverificatie, een wachtwoord dat alleen deze tool kent, en de DNS-records die
zeggen dat de aanbieder namens jouw domein mag mailen. Zonder SPF en DKIM belandt een nieuw adres in
de spam, en dan "werkt" alles terwijl niemand iets ontvangt.

## Beveiliging

- Een app-wachtwoord of API-sleutel die alleen mail mag versturen, niet lezen.
- Wissel het wachtwoord als het ooit in een chat of een document heeft gestaan.
- Zet bij de aanbieder een melding op ongewoon volume; een gelekt wachtwoord valt op aan de hoeveelheid.

## Kosten

Plan: het gratis of laagste plan van de aanbieder; het volume van een interne tool is honderden mails
per maand, geen tienduizenden. Plafond: het plan zelf; kies een aanbieder die stopt in plaats van
bijrekent. Uit je checklist: het deel voor mail. Upgraden pas als het volume het plan te boven gaat.
Stand van oktober 2026.

## Zo zie je dat het goed staat

- `pnpm mail:test` levert een mail op in de inbox en Beheer, Systeem zegt "SMTP: 0 in de rij".
- Een mail van de tool toont de naam van je project als afzender en geen waarschuwing in de client.

## Als het misgaat

| Wat je ziet | Wat er aan de hand is |
|---|---|
| "SMTP is niet ingericht; ontbreekt: ..." | Een van de vijf variabelen is leeg in die omgeving |
| Handdruk mislukt met een time-out | Verkeerde server of poort, of de aanbieder blokkeert tot het domein is bevestigd |
| "535 Authentication failed" | Gebruikersnaam of wachtwoord klopt niet, of de aanbieder wil een app-wachtwoord in plaats van het accountwachtwoord |
| De mail komt in de spam | SPF of DKIM ontbreekt of wijst naar de verkeerde aanbieder; controleer de DNS-records |
| Berichten blijven "wacht" | Zelfde als bij Graph: het transport is niet ingericht, zie Beheer, Systeem |

## Vul in

| Wat | Waarde |
|---|---|
| Aanbieder en plan | |
| Afzenderadres | |
| Wie het account beheert | |
| Datum ingericht en wachtwoord gewisseld op | |
