<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Lessen: werkwijze

Niet over een techniek maar over hoe je bouwt: de versie in beeld, de batterij, huisregels,
koppelingen die echt werken, wachtrijen, fail closed, scripts op productie en foutrapportage. De
vorm van elke les staat in [README.md](README.md).

## L-WERK-01 De versie in beeld, en per versie wat er met de hand moet

**Symptoom.** Een ronde zoeken naar een fout die al gerepareerd was maar nog niet in de openstaande
browser stond.

**Oorzaak.** Zonder zichtbare versie is "werkt het al?" niet te beantwoorden.

**Regel.** Eén constante `APP_VERSION`, zichtbaar in de rail en op het inlogscherm. Elke PR hoogt
hem op en heet ernaar; de eerste positie alleen op besluit van de eigenaar. Twee release-notes: een
volledige voor bouwers en een korte in gewone taal voor gebruikers, met een verplichte rubriek "Let
op bij bijwerken" zodra er handwerk is. Na elke uitrol een rooktest die alleen leest. Wat gebruikers
buiten de organisatie zien, achter een instelling, zodat terugdraaien een schakelaar is en geen
release.

**Afgedwongen door.** `lib/version.ts`, `pnpm smoke:prod` (de versie op het inlogscherm gelijk aan
de werkkopie), `e2e/02-about.spec.ts` (de versiekop in de korte notes). Patroon `versie-zichtbaar`.

## L-WERK-02 Een goedkope batterij, en echt bewijs tegen een echte database

**Symptoom.** Ruim duizend unittests stonden niet in CI en draaiden alleen als iemand eraan dacht.
Een overgeslagen e2e-job leest als groen.

**Oorzaak.** Wat niet in de poort staat, gebeurt uiteindelijk niet.

**Regel.** Bij elke wijziging de hele batterij, goedkoopste eerst: typecheck, lint plus huisregels,
unittests op pure functies in eigen bestanden, migratiecheck, driftcheck, contrast, build zonder
`.env.local`. Daarna tegen een wegwerpbranch: controlescripts (transactie die terugrolt, L-DRZ-13)
voor autorisatie in de query, constraints en idempotentie, en e2e alleen op de kernflow. Geen mocks
en geen tweede codepad: lokaal namaken is identiteit, niet opslag. Checks die echt naar buiten
schrijven blijven uit CI. Wie de wijziging maakte, draait en beoordeelt de batterij zelf en zet de
uitslag in de release notes.

**Afgedwongen door.** `.github/workflows/ci.yml` (quality en migrations); de e2e en de
controlescripts zijn lokaal en dus afspraak, vastgelegd in de Definition of done in `CLAUDE.md`.

## L-WERK-03 Een afspraak die niet wordt afgedwongen is een wens, en een controle die stil uitvalt is erger dan geen

**Symptoom.** De controle op `.env.example` deed niets, omdat de bestandswandeling op extensie
filterde en dat bestand op `.example` eindigt; intussen stonden daar echte geheimen in, één
`git add -A` van GitHub af. Een `.gitignore` met losse namen dekte `.env.production` niet.

**Oorzaak.** Een controle op een verkeerde selectie meldt niets en lijkt daardoor groen.

**Regel.** Een eigen huisregelscript naast ESLint voor wat ESLint niet ziet (verboden tekens,
kleuren buiten tokens, exports in `"use server"`, database-imports in de client, subquerykolommen,
geheimen in het sjabloon), meeliftend op `pnpm lint`. Een eigen bestandswandeling, zodat ook
ongecommitte bestanden meedoen; regels voor speciale bestanden op reponiveau; door tools
gegenereerde blokken vrijstellen; een verboden teken opbouwen uit zijn codepoint zodat de regel
zichzelf niet raakt. `.gitignore`: `.env*` met `!.env.example`. Een regel uit de agentinstructies
halen zodra lint of een constraint hem afdwingt.

**Afgedwongen door.** `scripts/lint-house-rules.mjs` met `scripts/house-rules/*` (en
`rules.test.mjs`, dat elke regel op een voorbeeld laat afgaan), `.githooks/commit-msg`, `.gitignore`.

## L-WERK-04 Ingericht is niet hetzelfde als werkend

**Symptoom.** Monitoring stond maanden stil omdat er een plaatshoudertekst als geheim in productie
stond. Een Teams-workflow antwoordde 202 terwijl het kanaal leeg bleef. Een lege foutenlijst kon
"niets stuk" of "niets komt aan" betekenen.

**Oorzaak.** Een koppeling die netjes uitgaat bij een ontbrekende sleutel, gaat ook netjes uit bij
een onzinsleutel. Een verlopen token is niet leeg. Een Power Automate-webhook neemt vrijwel elk JSON
aan, ook een kaart die hij niet kan plaatsen.

**Regel.** Een statusscherm per koppeling: stand (aan, ongetest, uit, stuk), ontbrekende variabelen
bij naam en nooit een waarde, vervaldatums, en waar het veilig kan één goedkope echte
proefaanroep. Geheimen op vorm valideren. Per koppeling een proefscript dat één minimale echte
handeling doet, met de controle op de bestemming in plaats van op de console, zonder de hele
wachtrij af te werken.

**Afgedwongen door.** Beheer, Systeem via `lib/integrations/health.ts` en de `HEALTH_PROVIDERS` van
de modules; de proefscripts `pnpm entra:status` (leest), `pnpm mail:test`, `pnpm teams:test` en
`pnpm blob:status` (schrijven één keer echt). Patroon `koppeling-die-netjes-uitstaat`.

## L-WERK-05 Schrijfacties naar buiten via een wachtrij

**Symptoom.** (voorkomen) Een mislukte mail zou een mislukte bedrijfshandeling zijn, en een storing
bij een externe dienst zou het aanmaken in de eigen app blokkeren.

**Oorzaak.** Rechtstreeks versturen koppelt twee dingen die los horen.

**Regel.** Een outbox- of jobrij in dezelfde transactie als de gebeurtenis, met een
idempotentiesleutel; `after()` en een cron versturen. Ontbrekende configuratie laat de rij op
`pending` staan in plaats van te falen. Pogingen tellen, na de grens `failed` met de fout erbij,
opnieuw aan te bieden vanaf een scherm. Een vastloopsignaal draait op een andere cron dan de
koppeling zelf, zodat het ook afgaat als die cron stilvalt. Bundelen per ontvanger bij het
versturen, zodat elke melding zijn eigen sleutel houdt. Liever zichtbaar traag dan onzichtbaar stuk.

**Afgedwongen door.** De unieke index op de sleutel in de tabellen `jobs` en `outbox`, de
modules jobs en messaging, en de vastloopcontrole in de outbox-cron. Patronen
`idempotentie-en-lease` en `outbox-en-berichtencatalogus`.

## L-WERK-06 Dicht falen op beveiliging, zacht falen op diagnose

**Symptoom.** (voorkomen) Een vergeten variabele die een deur openzet, en een diagnosescherm dat
zelf niet laadt op het moment dat er iets stuk is.

**Oorzaak.** Een default die "dan maar door" kiest, kiest bij beveiliging de verkeerde kant. Een
hulpmiddel dat gooit, maakt van één storing twee.

**Regel.** Fail closed: zonder `CRON_SECRET` weigert elke cron, zonder `PRODUCTION_DB_ENDPOINT`
faalt een deploy buiten productie, zonder `AUTH_SECRET` start Auth.js niet, de dev-login zonder
`APP_ENV=local` laat de app niet starten, zonder e-mail geen login. Fail soft: schemastand, thema, statusscherm en
foutrapportage vangen hun eigen fout en zeggen "onbekend" (niet weten is niet achter). Een half
ingerichte koppeling staat uit, niet half aan.

**Afgedwongen door.** De code in `lib/cron/guard.ts`, `scripts/db-deploy.ts`,
`lib/auth/providers/dev-login.ts`, `lib/auth/user-sync.ts`, `lib/db/schema-state.ts`,
`lib/domain/theme-for-request.ts`, `lib/integrations/health.ts`, `lib/monitoring/report.ts`.

## L-WERK-07 Scripts die je zonder angst op productie draait

**Symptoom.** Een opruimfilter op woorden als "test" of "demo" ving ook een echt record. Een
verkeerde branch is de duurste vergissing bij scripts.

**Oorzaak.** Patronen zijn te ruim, en zonder melding vooraf zie je niet waar je zit.

**Regel.** Elke cron is ook een `pnpm task:<naam>`. Elk script print eerst het doel (endpoint).
Ingrijpende scripts tonen standaard alleen het plan en voeren uit met `--apply`. Een expliciete
lijst in plaats van een patroon. Ook scripts schrijven in de audit log en verwijderen zacht. Eén
leesbare regel bij een fout in plaats van een stacktrace, via een wrapper (ook omdat tsx naar
CommonJS compileert en top-level await daar niet werkt). Op Beheer, Systeem beantwoorden of de
database achterloopt op de code: aantal toegepaste migraties tegen het journal.

**Afgedwongen door.** `scripts/lib/run.ts`, `scripts/lib/connection.ts`, `scripts/lib/seed-guard.ts`,
`lib/db/schema-state.ts`; verder afspraak.

## L-WERK-08 Serverfouten melden zonder persoonsgegevens te lekken

**Symptoom.** Twee productie-incidenten lieten niets achter. Toen de melding wel werkte, stond in
de foutmelding wat een gebruiker had getypt.

**Oorzaak.** Zonder haak gaat een serverfout nergens heen. De Drizzle-melding bevat de
queryparameters, een Postgres-detail bevat de sleutelwaarde, en een V8-stack begint met de melding
zelf.

**Regel.** `onRequestError` in `instrumentation.ts` plus één rapportfunctie. Melding én stack
schoonmaken (parameters, `Key (...)=(...)`, mailadressen, verbindingsstrings, tokens) en afkappen.
Rapporteren mag zelf nooit gooien. Met een foutenmonitor: DSN alleen op de server, EU-dataregio,
`release` is de versie, `environment` is `VERCEL_ENV`, drie alarmregels, en een proefmelding die
bewijst dat er iets aankomt en dat de schoonmaak werkt.

**Afgedwongen door.** `lib/monitoring/report.ts` (`scrubMessage`, `reportError`) met zijn test en
`instrumentation.ts`. Het doorsturen is de gereserveerde module monitoring-sentry (patroon
`sentry-envelope`).
