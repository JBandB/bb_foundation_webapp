<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# 90. Als iets misgaat

**Wat het is.** De bekende storingen, wat je ziet, waar het aan ligt en wat je doet. Begin altijd op
dezelfde drie plekken, dan de tabel.

## Eerst kijken

1. **Beheer, Systeem** in de tool: versie, omgeving, databaseschema, koppelingen. Rood zegt waar.
2. **Vercel, Deployments**: is de laatste deploy groen, en staat de versie linksonder in de rail
   gelijk aan `main`?
3. **Vercel, Logs** van de laatste minuten, gefilterd op fouten.

Geef Claude Code daarna de foutmelding letterlijk, met wat je deed en wanneer.

## De tabel

| Wat je ziet | Waarschijnlijke oorzaak | Wat je doet |
|---|---|---|
| Niemand kan inloggen (Microsoft) | Het client secret is verlopen | Nieuw secret in Entra, in Vercel zetten, opnieuw deployen (05, 06) |
| Niemand kan inloggen (wachtwoord) | `AUTH_SECRET` gewisseld of ontbreekt | Iedereen logt opnieuw in; tweestapsverificatie opnieuw instellen als het geheim wisselde (05b) |
| Eén persoon komt er niet in | Geen rol toegewezen, account inactief of vergrendeld | 11; vergrendeling duurt een kwartier |
| "Geen toegang" na inloggen bij Microsoft | Assignment required staat uit, of de rolwaarde wijkt af | 05 stap 4 en 5; `pnpm entra:status` |
| Het inlogscherm toont een oude versie | Deploy bezig of cache | Wachten, verversen zonder cache; anders Vercel, Deployments |
| Een pagina geeft een foutscherm met een code | Een fout op de server | Vercel, Logs met die code; de melding staat gescrubd in de log |
| Beheer, Systeem: databaseschema rood | De migratie van de laatste deploy is niet gedraaid | Build-log van de deploy; `pnpm db:deploy` faalde; herstel de migratie op `dev` met `pnpm db:roundtrip` en deploy opnieuw |
| Beheer, Systeem: een koppeling "uit" | Een variabele ontbreekt | De kolom noemt welke; 06 en de handleiding van die koppeling |
| Berichten blijven op "wacht" | Het transport is niet ingericht | 20 of 20b; "Verstuur wat klaarstaat" daarna |
| "vastgelopen" op Beheer | Er wacht al een uur werk zonder beweging | De laatste fout staat erbij; meestal een token of een variabele (23) |
| Uploaden weigert | Grens, type of inhoud, of het token is verlopen | De melding zegt welke; 22 bij een token |
| Een cron geeft 404 in de logs | `CRON_SECRET` ontbreekt of wijkt af | 06 |
| Een preview-deploy faalt op `PRODUCTION_DB_ENDPOINT` | Met opzet: de guard | 04 en 06 |
| Een preview komt op productiedata uit | Geen pull request, dus geen Neon-branch | Altijd via een pull request; 04 |
| De rekening van Neon loopt op | Compute slaapt niet | Autosuspend korter, crons minder vaak, branches weg (04, 23) |
| `pnpm template:verify` rood in de CI | Een owned bestand gewijzigd | `pnpm template:apply --force` of `pnpm template:adopt <pad>` |
| `pnpm template:apply` slaat bestanden over | Het project heeft owned bestanden gewijzigd | Bewust: adopt of force, zie `template/README.md` |
| Een pnpm-script faalt met een half pad en "is not recognized" | Een `&` in het Windows-gebruikerspad en een genest `pnpm` | Roep `node` rechtstreeks aan in scripts, zoals het template doet (07) |
| De e2e strandt op de webserver | `next build` met een `--env-file`-vlag | Zonder die vlag bouwen (07) |
| Een mail komt in de spam | SPF of DKIM niet goed | 20b; bij Graph beheert Microsoft 365 dat zelf |

## Terugdraaien

- **Een deploy**: in Vercel, Deployments, de vorige deploy kiezen en **Promote to Production**. Dat
  draait geen migratie terug.
- **Een migratie**: op `dev` met `pnpm db:down`; op productie alleen na overleg en met de terugweg uit
  `lib/db/migrations/down/`, want een migratie die is gedraaid wijzig je niet (zie
  `lib/db/migrations/README.md`).
- **Gegevens**: Neon heeft point-in-time restore binnen de history retention (04).

## Melden

Een storing die hier niet staat en die je hebt opgelost: zet hem erbij via een pull request, zodat de
volgende het in een minuut vindt. Een vermoeden van een lek: het geheim wisselen, de audit log
nalopen, en het adres uit `security.txt` is voor meldingen van buiten.
