<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Lessen: Vercel

Over de build, omgevingsvariabelen, crons, de functielimiet, de regio, de klok en het plan. De vorm
van elke les staat in [README.md](README.md).

## L-VRC-01 De build migreert, met een guard en een lock

**Symptoom.** (voorkomen) Een preview-deploy die stil de productiedatabase migreert, twee merges
die dezelfde migratie tegelijk draaien, een build die hangt tot Vercel hem afkapt.

**Oorzaak.** Welke Neon-branch aan welke omgeving hangt is een consoleinstelling, en die gaat een
keer mis. `pg_advisory_lock` wacht oneindig.

**Regel.** `buildCommand` in `vercel.json`, niet in een dashboard: eerst `db:deploy`, dan de build.
`db:deploy` gebruikt dezelfde loper als `db:migrate`, print omgeving en endpoint, weigert in
Preview als het endpoint gelijk is aan `PRODUCTION_DB_ENDPOINT` en ook als die variabele ontbreekt
(fail closed), en neemt een advisory lock met `pg_try_advisory_lock` in een lus met een deadline van
twee minuten. `PRODUCTION_DB_ENDPOINT` is alleen het id, geen geheim.

**Afgedwongen door.** `scripts/db-deploy.ts` en `vercel.json`.

## L-VRC-02 Omgevingsvariabelen in Vercel

**Symptoom.** Een halfuur zoeken omdat een gewijzigde variabele niet werkte. Foutmeldingen die
nergens naar wezen door een meegekopieerde regelovergang. Handmatig toegevoegde lokale variabelen
weg na `vercel env pull`.

**Oorzaak.** Een variabele geldt pas na een nieuwe deployment. `vercel env pull` haalt alleen
Development op en overschrijft `.env.local`. Kopiëren uit PowerShell neemt een `\n` mee.

**Regel.** Na een wijziging redeployen. Waarden zonder aanhalingstekens en zonder afsluitende
regel, geheimen op Sensitive, dezelfde key per omgeving met een eigen waarde. Integraties met echte
bijwerkingen alleen in Production; lokaal en preview leeg of naar een wegwerpdoel. Lokale extra's
zoals `AUTH_DEV_LOGIN=1` na elke pull opnieuw zetten. Geen `NEXT_PUBLIC_`-variant van iets dat
alleen de server gebruikt.

**Afgedwongen door.** Alleen afspraak, zie `docs/handleiding/06-variabelen-in-vercel.md`. Beheer,
Systeem noemt ontbrekende variabelen bij naam en toont nooit een waarde.

## L-VRC-03 Vercel-crons

**Symptoom.** Berichten gingen dubbel op elk heel uur. Een cron werd stil afgekapt. Een cronroute
zonder controle zou een publieke URL zijn die ieders data raakt, en hij staat in de build-output.

**Oorzaak.** Overlappende schema's (`*/15` en `0 *`) roepen dezelfde route twee keer aan. De
standaard functielimiet is krap. Crons kennen geen tijdzone.

**Regel.** Eén gedeelde guard: `CRON_SECRET` ontbreekt is 500 (fail closed), verkeerd of geen token
is 404 (verraad niet dat de route bestaat), vergelijken via sha256 plus `timingSafeEqual`.
`CRON_SECRET` als hex. Schema's in UTC met de zomertijd bewust aan de onschadelijke kant, of op twee
uren draaien en de taak laten beslissen. Schema's niet laten overlappen. `export const maxDuration`
expliciet per route. Elke cron ook als `pnpm task:<naam>`. Na een deploy het aantal jobs onder
Settings, Cron Jobs nalopen.

**Afgedwongen door.** `lib/cron/guard.ts` met `guard.test.ts`; `e2e/04-cron.spec.ts` en
`pnpm smoke:prod` controleren de 404 zonder token. Patroon `cronroute`.

## L-VRC-04 De functielimiet kapt stil af

**Symptoom.** Een synchronisatie met een externe API die lang had gewerkt, gaf ineens een foutpagina
en deed niets meer, zonder fout in de log.

**Oorzaak.** Eén rij per item wegschrijven, elk met een eigen roundtrip: bij vierhonderd items ruim
twintig seconden, over de limiet, en Vercel kapt de functie af zonder melding. Het werd erger met
elk item erbij. Een externe call zonder timeout houdt een hele ronde vast, en een afgekapte ronde
kan extern iets hebben aangemaakt zonder de verwijzing op te slaan.

**Regel.** In blokken schrijven (tweehonderd per keer), onafhankelijke queries tegelijk met
`Promise.all`, per ronde een `LIMIT` zodat hij binnen de tijd past, elke `fetch` met
`AbortSignal.timeout` (twintig seconden voor een API, langer alleen voor een bestand). Voor een
externe create eerst kijken of een eerdere ronde hem al maakte. Groei van de data meenemen bij het
testen.

**Afgedwongen door.** `lib/integrations/http.ts` (`fetchWithTimeout`, de enige `fetch` naar buiten)
en de `LIMIT` in de claimquery van module jobs. Verder afspraak.

## L-VRC-05 Functieregio naast de database

**Symptoom.** (voorkomen) Latency op elke query bij een hop tussen regio's; schermen met tientallen
queries merken dat meteen.

**Oorzaak.** De functieregio staat niet vanzelf bij de database.

**Regel.** Functieregio gelijk aan de Neon-regio (`fra1` bij `eu-central-1`), vastgelegd in
`vercel.json` onder `regions` en niet alleen in de console. EU voor data die persoonsgegevens kan
bevatten, ook bij een foutenmonitor, waar de dataregio bij het aanmaken van de organisatie
definitief is.

**Afgedwongen door.** `vercel.json`, met de regio uit `project.config.json` (`hosting.region`).

## L-VRC-06 Serverless onthoudt niets tussen aanroepen

**Symptoom.** (voorkomen) Een rate limiter met tellers in het geheugen beschermt niets.

**Oorzaak.** Elke aanroep kan op een andere instantie landen, en na het antwoord stopt de functie.

**Regel.** Tellers en sloten in de database (vaste vensters, opruimcron). Moduleniveau-cache alleen
als optimalisatie per warme instantie, zoals tokens. Werk na het antwoord met `after()` uit
`next/server`, met de wachtrijrij in dezelfde transactie en een cron als vangnet; de module met
`after()` apart houden zodat scripts de wachtrijcode zonder `next/server` laden. Async werk in
`onRequestError` afwachten. Het adres van de aanroeper is de eerste waarde van `x-forwarded-for`;
zonder header één gedeelde sleutel. Dat is alleen veilig omdat Vercel die header zelf zet en
overschrijft; achter een eigen proxy of CDN is die eerste waarde wat de client stuurde, en dan
draait een aanvaller de sleutel per verzoek. Op een andere host neem je de header die het platform
garandeert. De teller telt vóór het werk en ongeacht de uitkomst, en per account zodra iemand is
ingelogd (CLAUDE.md regel 17).

**Afgedwongen door.** `lib/domain/rate-limit.ts` (tabel `rate_limits`, `pnpm task:prune` ruimt op),
`lib/jobs/kick.ts` in module jobs (alleen daar staat `after()`), `instrumentation.ts`.

## L-VRC-07 De server draait in UTC

**Symptoom.** (voorkomen) `new Date().toISOString().slice(0, 10)` geeft tussen middernacht en twee
uur 's nachts de dag ervoor.

**Oorzaak.** Vercel draait in UTC, terwijl een kalenderdatum hangt aan de plek waar iemand werkt.

**Regel.** Tijdstippen als `timestamptz` in UTC. Een kalenderdatum apart afleiden in de tijdzone van
het project met `Intl.DateTimeFormat(..., { timeZone }).formatToParts`. Een datum zonder tijd als
string behandelen, niet in een `Date` wikkelen. Valideren met heen en terug door `Date`
(`2026-02-31` haalt de regex wel). e2e met vaste `timezoneId`.

**Afgedwongen door.** `lib/domain/dates.ts` (`dateIn`, `todayIso`, `isIsoDate`, tijdzone uit
`PROJECT`) met unittests, en `playwright.config.ts`.

## L-VRC-08 Plan, kosten en Node-versie

**Symptoom.** Vercel waarschuwde dat een nieuwe Node-major de build zou overnemen op een moment dat
je niet kiest. De rekening liep op door crons, previews en extra's.

**Oorzaak.** `engines: ">=22"` laat de major vrij, en een geforceerde Node-versie in de
projectinstellingen wint van `engines` en laat de build falen. Elke push bouwt en elke preview wekt
zijn database.

**Regel.** `engines.node` op één major (`24.x`), gelijk lokaal, in CI en op Vercel. Hobby staat geen
commercieel gebruik toe; op Hobby draait een cron hoogstens één keer per dag, dus de wachtrij wordt
direct na de handeling verwerkt met `after()` en de dagelijkse cron is het vangnet. Op Pro zet je de
schema's op het kwartier in werkuren en houdt `template.keepCrons` ze buiten de update. Ignored
Build Step: geen preview zonder PR, geen build als alleen documentatie wijzigt. Fluid compute aan,
analytics en observability uit als je ze niet gebruikt.

**Afgedwongen door.** `engines` in `package.json` en de schema's in `vercel.json`. De
consoleinstellingen zijn afspraak, zie `docs/handleiding/03-vercel.md` en `23-crons-en-taken.md`.
