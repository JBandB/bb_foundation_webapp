<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Lessen: Neon

Neon Postgres met de serverless driver (`@neondatabase/serverless` 1.1). Over pooled en directe
verbindingen, branches, kosten, rechten en de eigenaardigheden van de driver. De vorm van elke les
staat in [README.md](README.md).

## L-NEON-01 Pooled voor de applicatie, direct voor alles met DDL of sessiestaat

**Symptoom.** DDL over de pooler ging op onvoorspelbare punten mis.

**Oorzaak.** De host met `-pooler` is een transaction-mode pooler. Sessiestaat (`SET ROLE`, locks
over statements heen, lange DDL) is daar niet betrouwbaar.

**Regel.** `DATABASE_URL` (host met `-pooler`) voor de applicatie, want serverless opent veel korte
verbindingen. `DATABASE_URL_UNPOOLED` (dezelfde host zonder `-pooler`) voor drizzle-kit, migraties,
scripts en externe lezers die zelf verbindingen openhouden. Beide eindigen op `?sslmode=require`,
anders heb je de verkeerde string.

**Afgedwongen door.** Code: `drizzle.config.ts` en `scripts/lib/connection.ts` lezen
`DATABASE_URL_UNPOOLED`, `lib/db/client.ts` leest `DATABASE_URL`. Welke string waar vandaan komt
staat in `docs/handleiding/04-neon.md`.

## L-NEON-02 Geen lokale Postgres maar een eigen dev-branch

**Symptoom.** (voorkomen) Een exclusion constraint die lokaal niet bestaat, gaat alleen in productie
af.

**Oorzaak.** Een lokale Postgres mist extensies zoals `btree_gist` en wijkt in versie af.

**Regel.** Lokaal tegen een Neon dev-branch. `vercel env pull .env.local` haalt de
Development-waarden, en die wijzen naar dev, nooit naar productie. Extensies in een custom migratie
met `create extension if not exists`. Invarianten in het schema (check constraints, partiële unieke
indexen, exclusion constraints, triggers), met een controlescript dat bewijst dat ze afgaan.

**Afgedwongen door.** Afspraak, vastgelegd in `docs/handleiding/07-lokaal-werken.md`; `pnpm check:core`
bewijst de sloten van de kern tegen de branch.

## L-NEON-03 Het endpoint-id is de enige manier om te zien op welke branch je zit

**Symptoom.** Een seed met verzonnen gegevens belandde op productie. De guard had "geen echte
gebruikers, dus geen productie" gecontroleerd, en op een verse productiedatabase had nog niemand
ingelogd.

**Oorzaak.** Branches zijn alleen aan het endpoint-id in de connectiestring te onderscheiden. Een
heuristiek over de inhoud laat precies het gevaarlijkste geval door.

**Regel.** Elk script print eerst het endpoint (host tot de eerste punt, zonder `-pooler`, nooit
het wachtwoord). Een destructief script vraagt dat je de branch bij naam noemt
(`SEED_TARGET=<endpoint>`). Een statusscript combineert twee onafhankelijke signalen: wat je
verklaarde en wat de database zelf zegt. Een bootstrap die overal veilig is (het minimum om in te
loggen), los van de seed die alleen op een wegwerpbranch mag.

**Afgedwongen door.** `scripts/lib/connection.ts` (`withDirectDb` print het endpoint),
`scripts/lib/seed-guard.ts` (`assertConfirmedTarget`), `scripts/db-status.ts` (het oordeel),
`scripts/db-bootstrap.ts` (veilig op elke branch).

## L-NEON-04 De Vercel-integratie maakt alleen een wegwerpbranch bij een pull request

**Symptoom.** Een preview-deploy zonder pull request (bijvoorbeeld Redeploy op `main`) kwam uit op
de productiedatabase en zou die migreren.

**Oorzaak.** Zonder PR valt Vercel terug op de basiswaarde van `DATABASE_URL` in de
Preview-omgeving, en die wijst naar productie. De integratie beheert die variabele: met de hand
overschrijven breekt de integratie zodra Neon een branch verplaatst.

**Regel.** Een preview komt uit een PR. Beheerde variabelen niet overschrijven, alleen de
Development-waarde zelf zetten. De deploy-migratie weigert een preview op de productiebranch
(L-VRC-01). Migraties gelden per branch: dev en productie zijn twee databases. PR-branches
automatisch laten opruimen.

**Afgedwongen door.** `scripts/db-deploy.ts` (`PRODUCTION_DB_ENDPOINT`, fail closed). De rest staat
in `docs/handleiding/03-vercel.md` en `04-neon.md`.

## L-NEON-05 Een koude compute ziet eruit als een kapotte login

**Symptoom.** De eerste e2e-tests vielen om met "inloggen werkt niet", een halve avond zoeken naar
een fout die er niet was. In de app bleef na een klik seconden het oude scherm staan.

**Oorzaak.** Neon zet de compute na een paar minuten stil en het eerste verzoek wacht op het
opstarten. De dev-login doet in `authorize` een query, die valt om, en Auth.js stuurt zonder uitleg
terug naar de inlogpagina.

**Regel.** De e2e-globalSetup doet eerst `select 1`. Expect-timeout tien seconden in plaats van
vijf, `retries: 1` ook lokaal, de inloghelper één herkansing, zware schermen `waitForURL` met een
ruime timeout. In de app een laadskelet waar dat mag (L-NEXT-06).

**Afgedwongen door.** `e2e/global-setup.ts`, `playwright.config.ts`, `e2e/helpers.ts`,
`components/ui/loading.tsx`.

## L-NEON-06 Wat de Neon-rekening laat oplopen

**Symptoom.** De compute sliep nooit. Een tabel van een paar honderd kilobyte kreeg anderhalf miljoen
updates in een maand.

**Oorzaak.** Neon rekent compute-uren, en vijf crons elk kwartier, dag en nacht, hielden hem wakker.
Elke rij-update kost WAL, history en autovacuum, ook als er niets veranderde.

**Regel.** Kwartiercrons alleen op werkuren (in UTC uitgedrukt), daarbuiten hoogstens per uur; op
het Hobby-plan van Vercel is het sowieso één keer per dag en doet `after()` het echte werk
(L-VRC-08). Alleen rijen schrijven die echt veranderd zijn. Autosuspend vijf minuten, het kleinste
compute-minimum, PR-branches automatisch weg, history retention op wat je nodig hebt. Elke preview
wekt zijn eigen branch en de batterij op dev ook: het aantal versies per dag is een kostenknop.

**Afgedwongen door.** De cronschema's in `vercel.json`. De consoleinstellingen zijn afspraak en
staan in `docs/handleiding/04-neon.md` onder Kosten.

## L-NEON-07 De applicatie is eigenaar van haar tabellen, dus `REVOKE` is geen slot

**Symptoom.** (voorkomen) Een append-only audit log die alleen met `REVOKE UPDATE, DELETE` was
beschermd, zou vanaf de verbinding van de applicatie gewoon te wijzigen zijn.

**Oorzaak.** Op Neon verbindt de applicatie standaard als eigenaar, en een eigenaar mag zichzelf
rechten teruggeven.

**Regel.** Append-only afdwingen met een before update/delete-trigger die gooit: werkt voor elke rol
en is te testen vanaf dezelfde verbinding. `REVOKE` als tweede slot. `TRUNCATE` en `DROP` houd je
als eigenaar niet tegen, daar zijn backup en point-in-time restore voor. Eindstand: een aparte
applicatierol zonder DDL en zonder update of delete op de log.

**Afgedwongen door.** De trigger in `lib/db/migrations/0001_core_guards.sql`; `pnpm check:core`
bewijst dat update en delete falen. De aparte applicatierol zit niet in het template: een project
dat hem wil, maakt hem in de Neon-console en zet die string in `DATABASE_URL`.

## L-NEON-08 De serverless driver en andere Neon-eigenaardigheden

**Symptoom.** Scripts bleven hangen nadat ze klaar waren. Een rolwachtwoord als vooraf berekende
hash werd geweigerd. Een rolwissel over een pool zou stil op een andere verbinding belanden.

**Oorzaak.** Een open `Pool` houdt het proces in leven. `SET ROLE` geldt per sessie en een pool
wisselt stil van verbinding. Neon weigert een vooraf berekende SCRAM-hash. Rollen die in de
Neon-console ontstaan zijn lid van `neon_superuser`.

**Regel.** `Pool` uit `@neondatabase/serverless` (WebSocket) zodra je transacties nodig hebt, niet
de HTTP-driver. In scripts de pool altijd sluiten (`finally pool.end()`), in serverless juist niet.
Sessiestaat op één client. `CREATE DATABASE` buiten een transactie en op de directe verbinding. Bij
het dichtzetten van `CONNECT` aan `neon_superuser` expliciet teruggeven. `pool.on("error")` op een
ad-hoc pool.

**Afgedwongen door.** Code: `lib/db/client.ts` (`closeDb`) en `scripts/lib/connection.ts`
(`withDirectDb` sluit altijd).
