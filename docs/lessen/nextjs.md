<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Lessen: Next.js en React

Next.js 16 met de App Router en React 19, inclusief de e2e met Playwright. De vorm van elke les
staat in [README.md](README.md).

## L-NEXT-01 Next 16 is niet de Next uit je geheugen

**Symptoom.** Code volgens bekende patronen klopte niet: de prop van `error.tsx` heet `retry`, niet
`reset`; `params` is een Promise; `next build` lint niet meer; `next dev` zet een eigen agentblok in
`CLAUDE.md` terug, met een em-dash erin.

**Oorzaak.** Breaking changes in Next 16 ten opzichte van trainingsdata en voorbeelden.

**Regel.** Eerst de meegeleverde docs lezen in `node_modules/next/dist/docs/`. Lint als eigen
CI-stap, `typescript.ignoreBuildErrors: false` expliciet. Het gegenereerde agentblok committen en
vrijstellen van tekstregels (vervangen door spaties zodat regelnummers kloppen).

**Afgedwongen door.** De instructie onderaan `CLAUDE.md` (afspraak), de lintstap in `ci.yml`, en de
vrijstelling van door tools gegenereerde blokken in `scripts/house-rules/no-em-dash.mjs`.

## L-NEXT-02 Een `"use server"`-bestand exporteert alleen async functies

**Symptoom.** Een middag zoeken naar `Cannot read properties of undefined` op een plek die er niets
mee te maken had.

**Oorzaak.** De bundler vervangt elke export uit zo'n bestand door een verwijzing naar een
serverfunctie. Een geëxporteerde constante of object is in de browser `undefined`. TypeScript,
ESLint en de build zeggen niets.

**Regel.** In een `"use server"`-bestand alleen `export async function` en `export type` of
`interface`. Constanten, schema's en state-types in een buurbestand zonder `"use server"`.

**Afgedwongen door.** Huisregel `server-actions` in `pnpm lint`.

## L-NEXT-03 Eén constante uit een databasemodule trekt de driver de browser in

**Symptoom.** Een clientchunk van ruim een halve megabyte op twee schermen, voor één labelfunctie en
één lijst.

**Oorzaak.** Een waarde-import (geen `import type`) in een clientcomponent uit een module die zelf
`@/lib/db` of `drizzle-orm` importeert, bundelt driver, drizzle en schema mee. `server-only` was
geen optie: dat gooit ook in tsx-scripts en vitest, die dezelfde modules laden.

**Regel.** Wat de client nodig heeft (constanten, pure functies) in een eigen module zonder
databaseimport. De oude plek mag het opnieuw exporteren. Uit de db-, jobs-, messaging-, files- en
integratiemappen in de client alleen `import type`. Na de build controleren dat geen clientchunk
`@neondatabase` bevat.

**Afgedwongen door.** Huisregel `client-imports` (kijkt naar mapprefixen en naar directe db-imports
van de doelmodule); een project voegt eigen prefixen toe in `scripts/house-rules/project-rules.mjs`.

## L-NEXT-04 Over de grens naar een clientcomponent gaat alleen platte data

**Symptoom.** Een scherm viel om met de generieke foutpagina nadat een tekst in het labelbestand een
functie met een invulwaarde was geworden.

**Oorzaak.** Props van server naar client worden geserialiseerd. Een functie overleeft dat niet en de
render faalt.

**Regel.** Aan clientcomponenten alleen strings, getallen, booleans, arrays en gewone objecten.
Teksten met invulwaarden op de server invullen, een `Map` als gewoon object doorgeven. Labelblokken
die naar de client gaan bevatten geen functies.

**Afgedwongen door.** Alleen afspraak, plus de e2e op het scherm waar het misging.

## L-NEXT-05 React 19 maakt een formulier leeg na elke server action

**Symptoom.** Na één validatiefout stond alles wat iemand had ingevuld weer leeg.

**Oorzaak.** React 19 reset een formulier zodra een server action klaar is, ook als die een fout
teruggeeft.

**Regel.** De action-state geeft de ingevulde waarden terug en de velden zetten ze als
`defaultValue` terug (een bestandsveld kan dat niet). Een ongestuurd veld dat na verversen een
nieuwe serverwaarde moet tonen, krijgt een `key` met die waarde. Een action via `useActionState`
heeft altijd de vorm `(vorigeState, formData)`, dus in ESLint `argsIgnorePattern: "^_"`. Geen
`router.refresh()` na een action die al `revalidatePath` doet: het antwoord brengt de verse pagina
al mee, een tweede verversing rendert alles nogmaals.

**Afgedwongen door.** De ESLint-instelling in `eslint.config.mjs` en de vorm van
`components/ui/form-state.ts`. Het terugzetpatroon is afspraak.

## L-NEXT-06 Een `loading.tsx` maakt van `notFound()` een 200

**Symptoom.** Een tak die een echte 404 belooft aan wie er niets te zoeken heeft, gaf status 200 met
de niet-gevonden-pagina.

**Oorzaak.** Een laadgrens maakt van de pagina een stream. De headers zijn al verstuurd voordat
`notFound()` zijn status kan zetten.

**Regel.** Geen `loading.tsx` boven een tak die met `notFound()` afschermt (prijs: daar geen
skelet). Elders wel een grof skelet, met `prefers-reduced-motion`.

**Afgedwongen door.** `e2e/05-admin.spec.ts` verwacht een echte 404 voor een rol zonder recht op
Beheer; `components/ui/loading.tsx` legt het uit.

## L-NEXT-07 Een layout is geen beveiligingsgrens

**Symptoom.** Pagina's onder een beschermde layout controleerden de sessie niet zelf. Een datum of
id in de URL die geen datum of uuid was, gaf een 500.

**Oorzaak.** Layouts renderen niet opnieuw bij navigatie in de client (partial rendering). Server
actions en route handlers zijn losse publieke endpoints. Invoer uit de URL is invoer van buiten, en
Postgres weigert een ongeldige uuid met een castfout.

**Regel.** Elke pagina die data leest, elke server action en elke route handler begint met
`requireSession()` en een expliciete `can()`. Navigatie op rol filteren op de server, niet met CSS.
Id's en datums valideren vóór de query: ongeldig is 404 of een terugval, geen 500. De oude reden om
geen middleware te gebruiken (de edge runtime kon de databaselaag niet laden) is in Next 16
achterhaald: middleware heet nu `proxy` en draait op Node.js. De regel "controle per pagina en per
actie" blijft, omdat een proxy niets weet van wat een pagina gaat lezen.

**Afgedwongen door.** `lib/auth/session.ts` en `lib/auth/can.ts`; `e2e/05-admin.spec.ts` (een
niet-beheerder krijgt 404 op Beheer); `pnpm smoke:prod` (pagina's achter de sessie sturen door naar
de inlog); `isIsoDate` in `lib/domain/dates.ts` en de uuid-controle in de downloadroute van module
files.

## L-NEXT-08 `next/font/google` maakt elke build afhankelijk van Google

**Symptoom.** Een build lukte pas na tien pogingen, omdat Google Fonts een uur onbereikbaar was
vanaf de bouwmachine.

**Oorzaak.** `next/font/google` haalt de fontbestanden bij elke build op.

**Regel.** Fonts zelf hosten via `next/font/local` met de bestanden in de repo. Ook geen `<link>`
naar een fontdienst: dat is een request met het IP-adres van elke bezoeker.

**Afgedwongen door.** `app/layout.tsx` met `app/fonts/`; verder afspraak.

## L-NEXT-09 Bestanden die je tijdens het draaien leest, gaan niet vanzelf mee de deploy in

**Symptoom.** Een scherm dat markdown uit de repo leest, werkte lokaal en was op Vercel leeg.

**Oorzaak.** Next neemt alleen bestanden mee die hij in de code ziet. Omgekeerd ziet de bundelaar
`join(process.cwd(), variabele)` als "ergens in de projectmap" en neemt hij de hele broncode mee.

**Regel.** `outputFileTracingIncludes` per route voor wat je leest. Paden als letterlijke aanroepen
per bestand, nooit uit een tabel en nooit uit de URL.

**Afgedwongen door.** `lib/config/next-base.ts` (de includes voor Over de tool) en de drie vaste
paden in `lib/docs/read-doc.ts`.

## L-NEXT-10 Foutpagina's en foutrapportage horen bij de eerste versie

**Symptoom.** Bij twee productie-incidenten was het rauwe zwarte Vercel-scherm het enige wat er
stond: Engels, zonder context, zonder versie, en in de logs niets bruikbaars.

**Oorzaak.** Zonder `error.tsx`, `global-error.tsx` en `not-found.tsx` toont Next zijn eigen kale
pagina's, en zonder haak gaat een serverfout nergens heen.

**Regel.** `error.tsx` toont de digest (die Next in plaats van de echte melding naar de browser
stuurt) en de versie. `global-error.tsx` heeft eigen `html` en `body` en inline stijlen, want de
globale CSS laadt daar niet. `not-found.tsx` zonder sessie en zonder database. `instrumentation.ts`
met `onRequestError` vangt fouten uit servercomponenten, route handlers en server actions en wacht
de melding af, want de functie stopt zodra het antwoord weg is.

**Afgedwongen door.** `app/error.tsx`, `app/global-error.tsx`, `app/not-found.tsx`,
`instrumentation.ts` en `lib/monitoring/report.ts`. Het doorsturen naar Sentry is de gereserveerde
module (patroon `sentry-envelope`).

## L-NEXT-11 Na een deploy kan een open tabblad een server action niet meer vinden

**Symptoom.** Een 404 op een server action, niet reproduceerbaar, op een dag met vijf deploys.

**Oorzaak.** Een tabblad van voor de deploy roept een action aan met een id uit de oude build.

**Regel.** Verversen is het antwoord, geen codewijziging. Maak het diagnoseerbaar: de versie
zichtbaar in de UI en een rooktest die de getoonde versie met de werkkopie vergelijkt (L-WERK-01).

**Afgedwongen door.** `lib/version.ts` in de rail en op het inlogscherm, `pnpm smoke:prod`.

## L-NEXT-12 Donkere modus hoort in de HTML die de server stuurt

**Symptoom.** Wie donker koos zag eerst een wit scherm dat een tel later omsloeg. Componenten met
`dark:` volgden de systeeminstelling in plaats van de keuze van de gebruiker.

**Oorzaak.** Een thema dat pas in JavaScript wordt gezet, komt na de eerste paint. In Tailwind 4
betekent `dark:` standaard `prefers-color-scheme`.

**Regel.** De root-layout leest de voorkeur uit de database en zet de class op `html`. React `cache`
maakt er één query per verzoek van; bij een fout of zonder sessie is het antwoord licht. In
`globals.css` `@custom-variant dark (&:where(.dark, .dark *));`. Een tak die vast licht is, zet
`.light` en schildert zijn eigen achtergrond. Contrast in beide modi narekenen.

**Afgedwongen door.** `lib/domain/theme-for-request.ts`, `app/globals.css`, `e2e/03-theme.spec.ts`
(de class staat in de server-HTML), `pnpm check:contrast` in CI. De gids is `docs/THEME.md`.

## L-NEXT-13 Security headers en de publieke kant van de app

**Symptoom.** Chrome toonde na het inloggen "Gevaarlijke site" op de OAuth-callback van het eigen
domein, terwijl de site in orde was.

**Oorzaak.** Google Safe Browsing had de host als phishing gemarkeerd; de precieze reden is niet
vastgesteld. Daarnaast vraagt een nonce-CSP middleware per request, terwijl Next met inline scripts
hydrateert.

**Regel.** Headers voor alle routes: CSP met `'self'` en `'unsafe-inline'` voor scripts en styles,
`'unsafe-eval'` alleen buiten productie (HMR), `frame-ancestors 'none'` plus `X-Frame-Options
DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy`, `connect-src 'self'` omdat alle externe
calls op de server gebeuren. XSS dragen in de code: geen `dangerouslySetInnerHTML`, tekst van
gebruikers via een eigen parser naar JSX. Publiek: het inlogscherm zegt wat het is en waar inloggen
gebeurt, `robots.txt`, `/.well-known/security.txt` (`Expires` jaarlijks vernieuwen), DMARC op het
domein, geen hangende subdomeinen.

**Afgedwongen door.** `lib/config/next-base.ts` (de headers), `lib/domain/rich-text.ts` (de
parser), `pnpm smoke:prod` (headers, `robots.txt`, `security.txt`). De e2e draait op `next start` en
test dus de productieheaders.

## L-NEXT-14 e2e tegen een productiebuild, niet tegen `next dev`

**Symptoom.** Een e2e-run kon niet naast je eigen dev-server draaien. Een suite die lokaal groen
was, was dat elders niet.

**Oorzaak.** Next weigert een tweede `next dev` voor dezelfde map, ook op een andere poort. Dev
compileert per verzoek en cachet anders.

**Regel.** Playwright start zelf `next start` op een eigen poort, `reuseExistingServer: false`, na
een verse build (`pnpm e2e:all`). Auth.js is in productiemodus streng over de host: `AUTH_URL` en
`AUTH_TRUST_HOST=true` in de webServer-env, anders blijft de browser zonder melding op de
callback-URL staan. Voor handmatige rondes per build een nieuwe poort, en oude `next
start`-processen stoppen, want die serveren de oude build.

**Afgedwongen door.** `playwright.config.ts` en het script `e2e:all` in `package.json`.

## L-NEXT-15 Een e2e-suite op een gedeelde database moet deterministisch zijn

**Symptoom.** Tests gooiden elkaars regels weg. Een spec die een toestand vergrendelde, liet alle
latere specs stranden. Na een paar runs weigerde een formulier alles een uur lang (rate limiter
vol: lokaal delen alle pogingen het adres "onbekend"). Een achtergebleven voorkeur zette acht tests
tegelijk op rood.

**Oorzaak.** Gedeelde staat in één database, over tests en over runs heen.

**Regel.** `workers: 1`, `fullyParallel: false`, bestanden genummerd omdat Playwright op naam
sorteert. De globalSetup maakt de database wakker, zet geseede staat terug en leegt tellers. Een
test die een open toestand nodig heeft, regelt die zelf in plaats van op de volgorde te hopen.
Tests zetten hun eigen fixtures neer (herkenbare namen buiten het bereik van echte data) en ruimen
hard op. Vaste datums in plaats van vandaag, `locale` en `timezoneId` vast, `forbidOnly` in CI,
trace en screenshot alleen bij falen.

**Afgedwongen door.** `playwright.config.ts`, `e2e/global-setup.ts`, `e2e/helpers.ts`; een project
zet zijn eigen opruimstappen in `e2e/project-setup.ts`.

## L-NEXT-16 Selectors en wachten in de App Router

**Symptoom.** `getByRole("alert")` vond een lege melding. `networkidle` kwam soms nooit. Een test
herlaadde terwijl de server action nog liep (serverlog: "The destination stream closed early").
`toHaveURL` faalde op een koud, zwaar scherm. Een `waitForURL` die ook de huidige pagina matchte,
navigeerde weg tijdens het aanmaken. De hele suite viel om toen de inlogteksten van taal wisselden.

**Oorzaak.** Next zet zelf een lege `div[role="alert"]` als route-announcer. De App Router prefetcht
elke zichtbare link, dus netwerkstilte is niet gegarandeerd. `isVisible()` wacht niet. De
expect-timeout is voor assertions, niet voor navigatie.

**Regel.** Smalle selectors (`p[role="alert"]`). Wachten op een specifiek element dat pas na de
gebeurtenis bestaat (`waitFor({ state: "visible", timeout })`), niet op `networkidle`.
`waitForURL` met een patroon dat alleen de bestemming matcht, en een ruime timeout voor zware
schermen. Na een opslaande actie wachten op het serverantwoord voor je herlaadt. Doen wat een
gebruiker doet: Enter in plaats van `locator.blur()`, de muis in stappen en een paar pixels binnen
een grens. UI-teksten in tests uit `lib/i18n` lezen, nooit letterlijk. Een test die "de tabel" pakt
(`getByRole("table")`) breekt zodra een scherm een tweede tabel krijgt: filter op een kolomkop
(`getByRole("table").filter({ has: page.getByRole("columnheader", { name }) })`).

**Afgedwongen door.** De patronen in `e2e/helpers.ts` en de owned specs; verder afspraak.

## L-NEXT-17 Middleware heet `proxy.ts`, en een nonce-CSP maakt elke pagina dynamisch

**Symptoom.** (voorkomen) Twee `Content-Security-Policy`-headers naast elkaar, allebei afgedwongen
door de browser; na het invoeren van een nonce verdween elke pagina uit de lijst van statische
routes in de build; de service worker werd geweigerd.

**Oorzaak.** In Next 16 heet middleware `proxy.ts`. Een nonce is per verzoek, dus elke pagina die de
header krijgt, wordt dynamisch. Onder `'strict-dynamic'` telt `'self'` in `script-src` niet meer,
ook niet voor een worker.

**Regel.** Eén CSP: uit `proxy.ts` per verzoek (`x-nonce` op het verzoek, de header op het
antwoord), en de vaste CSP-header uit `next.config.ts` weg. `script-src 'self' 'nonce-...'
'strict-dynamic'` (in ontwikkeling plus `'unsafe-eval'`), `style-src` houdt `'unsafe-inline'`
(React zet `style`-attributen), `worker-src 'self'` uitdrukkelijk, `object-src 'none'`. De matcher
slaat `/api`, `_next/static`, `_next/image`, alles met een extensie en prefetches over. Na de eerste
uitrol één ronde door elk scherm.

**Afgedwongen door.** `proxy.ts` en `lib/security/csp.ts` met test; de vaste CSP is uit
`lib/config/next-base.ts` gehaald. De e2e `05b-csp.spec.ts` eist één CSP-header.

## L-NEXT-18 Onder `'strict-dynamic'` dragen de chunks die Next zelf invoegt geen nonce

**Symptoom.** (voorkomen) Een e2e die elk `<script>` op de pagina op een nonce toetst, faalt op de
chunks die Next na het laden zelf invoegt.

**Oorzaak.** Dat hoort zo: onder `'strict-dynamic'` erven die chunks het vertrouwen van het script
dat ze laadt, en dat script draagt de nonce wel.

**Regel.** Toets de scripttags in de HTML van de server (daar staat de nonce op elk `<script>`), een
andere nonce per verzoek, en de meldingen van de browser (geen weigering in de console). De chunks
daarna laat je met rust.

**Afgedwongen door.** De e2e `05b-csp.spec.ts`: de nonce op elk `<script>` in de HTML van de server,
een andere nonce per verzoek, en geen weigering in de console na het laden en het klikken.

## L-NEXT-19 Middleware is geen beveiligingsgrens, en dat is drie keer bewezen

**Symptoom.** (voorkomen) Een app die alleen in middleware controleert of iemand is ingelogd, is
met één header te omzeilen.

**Oorzaak.** In maart 2025 (CVE-2025-29927, `x-middleware-subrequest`), in 2026 opnieuw
(CVE-2026-45109) en in juli 2026 met Turbopack (CVE-2026-64642) was de middleware van Next.js te
omzeilen. Middleware draait vóór de route en kan door een fout in het framework worden overgeslagen;
de route zelf niet.

**Regel.** Elke pagina, server action en route handler controleert zelf sessie en recht
(CLAUDE.md regel 11). `proxy.ts` zet alleen de CSP en weigert niets. En de patchversie van Next
bijhouden: in 2026 kwamen de kritieke fixes in 15.5.18, 16.2.6, 16.3.3 en 16.4.1 (stand oktober
2026; controleer de advisory).

**Afgedwongen door.** De huisregel `session-first` en `requireSession()` op elke plek; `proxy.ts`
heeft geen autorisatie. De versie bewaakt Dependabot met `pnpm audit --prod` in de CI.
