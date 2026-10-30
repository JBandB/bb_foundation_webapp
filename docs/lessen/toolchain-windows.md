<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Lessen: de toolchain en Windows

pnpm, Node, env-files, PowerShell, de pins van compiler en linter, en de strict-opties van
TypeScript. De meeste van deze lessen zijn op Windows geleerd en gelden ook in een Linux-CI. De vorm
van elke les staat in [README.md](README.md).

## L-WIN-01 Een `&` in het gebruikerspad breekt geneste pnpm-aanroepen

**Symptoom.** Een script dat zelf weer `pnpm <script>` aanroept faalde met `'...\AppData\Roaming\npm\'
is not recognized` en `Cannot find module ...\node_modules\pnpm\bin\pnpm.mjs`: een melding die naar
een ontbrekende module wijst.

**Oorzaak.** De pnpm-shim is een `.cmd`-bestand, en `cmd.exe` leest de `&` in een pad als
`C:\Users\Naam&Co` als commandoscheiding. Ook `spawnSync("pnpm", ..., { shell: true })` vanuit Node
gaat zo mis. `corepack enable` wil naar Program Files schrijven en heeft daar geen rechten.

**Regel.** In `package.json` nooit `pnpm a && pnpm b`; de binary direct aanroepen
(`node node_modules/tsx/dist/cli.mjs scripts/x.ts`, `eslint . && node scripts/x.mjs`). pnpm vanuit
Node starten via `process.execPath` met `pnpm.cjs` (of `npm_execpath`), zonder shell. Paden in
scripts naar `/` normaliseren voor je ze vergelijkt, zodat regels op Windows en in Linux-CI
hetzelfde doen. Een gouden test in een map met een spatie en een `&` in de naam.

**Afgedwongen door.** De vorm van de scripts in `package.json` (de patcher van het template schrijft
ze zo), `template/ci/golden.mjs` (start pnpm via zijn JavaScript-startpunt en test in een pad met
`&`), en de bestandswandeling van de huisregels in `scripts/house-rules/files.mjs`.

## L-WIN-02 `next build` met `--env-file` levert een build zonder `BUILD_ID`

**Symptoom.** Een volle e2e-ronde strandde meteen op de webserver: "Could not find a production
build".

**Oorzaak.** Next start workers met `NODE_OPTIONS`, en die weigeren `--env-file-if-exists`
(`ERR_WORKER_INVALID_EXEC_ARGV`); de build eindigt zonder `BUILD_ID`.

**Regel.** Bouwen met `node node_modules/next/dist/bin/next build` zonder env-vlag (de build heeft
geen database nodig, zie L-DRZ-10). `next start` mag de vlag wel krijgen.

**Afgedwongen door.** Het script `e2e:all` in `package.json` bouwt zonder vlag en `build` is kaal
`next build`; CI bouwt sowieso zonder `.env.local`.

## L-WIN-03 Omgevingsvariabelen meegeven werkt anders in PowerShell

**Symptoom.** Handmatige productiecommando's in release notes moesten worden herschreven naar een
vorm die ook in PowerShell werkt.

**Oorzaak.** PowerShell kent geen inline omgevingsprefix (`VAR=x commando`).

**Regel.** `node --env-file=.env.local --env-file=.env.production <script>` werkt in PowerShell en
bash; bij meerdere `--env-file` wint het laatste bestand. In `package.json`
`--env-file-if-exists=.env.local`, zodat dezelfde scripts in CI zonder dat bestand draaien.
Handmatige stappen in release notes in deze vorm.

**Afgedwongen door.** De vorm van de scripts in `package.json`, verder afspraak.

## L-WIN-04 Hulpscripts van de agent op Windows

**Symptoom.** Een heredoc in de Bash-tool van de agent strandde op "unexpected EOF while looking for
matching `'`" bij een apostrof in lopende tekst, en `\\n` werd een echte regelovergang. Een
tsx-script in een tijdelijke map vond de pakketten van de repo niet. `import.meta.url` gaf `%7E` in
plaats van `~` in het korte Windows-pad.

**Oorzaak.** De Bash-tool bewerkt de opdrachttekst voor bash hem ziet. Een tijdelijke map ligt
buiten de `node_modules`-resolutie. Het tijdelijke pad is een 8.3-naam met `~`.

**Regel.** Scripts langer dan een paar regels, of met quotes, backslashes of regexes, met de
schrijftool aanmaken en daarna draaien. Een tsx-script dat repo-pakketten importeert in de repo
zetten (`scripts/tmp-*.ts`) en na afloop weghalen. Playwright vanuit een losse map laden met
`createRequire(<repo>/package.json)`. Uitvoerpaden via een omgevingsvariabele meegeven.

**Afgedwongen door.** Alleen afspraak; `docs/WERKWIJZE.md` noemt het bij "als Claude vastloopt".

## L-WIN-05 Toolchainversies bewust vastzetten, met de reden erbij

**Symptoom.** (voorkomen) Een behulpzame upgrade laat lint niet meer starten: `typescript-eslint
does not support TS 7.0`, of `contextOrFilename.getFilename is not a function` bij
`react/display-name`.

**Oorzaak.** typescript-eslint loopt een major achter op TypeScript, en ESLint 10 breekt
eslint-plugin-react dat via eslint-config-next meekomt. `package.json` kan geen commentaar dragen,
dus de reden van een pin staat nergens.

**Regel.** Exacte versies voor compiler en linter (TypeScript 6, ESLint 9), samen upgraden pas als
beide ecosystemen meekunnen, en de reden in een bestand dat wel commentaar kan dragen.
`packageManager` en `engines` vastzetten. In pnpm `allowBuilds` alleen voor pakketten met een nodig
installscript. Adviezen in de dev-toolchain via `overrides` binnen dezelfde major.

**Afgedwongen door.** Exacte versies in `package.json` (beheerd door de patcher van het template:
een project dat een pin wil loslaten zet het pakket in `template.skipDependencies`) en
`pnpm-workspace.yaml`, waar de reden in het commentaar staat.

## L-WIN-06 TypeScript strict-opties en wat ze vragen

**Symptoom.** (voorkomen) Aannames die pas in productie opvallen, zoals een `!` op een
databaseresultaat dat soms leeg is.

**Oorzaak.** Standaard-strict laat index-toegang en optionele velden te ruim door.

**Regel.** `strict` plus `noUncheckedIndexedAccess`, `exactOptionalPropertyTypes` en
`noImplicitOverride`. De gevolgen kennen: `rows[0]` is `T | undefined`; een optioneel veld zet je met
een conditionele spread, niet met `undefined`; een subklasse die een basisveld overschrijft vraagt
`override`. Geen `any` en geen non-null assertion. Met `allowJs` uit horen tests voor `.mjs`-scripts
als `.test.mjs`. Een variabele mag niet `module` heten (ESLint).

**Afgedwongen door.** `tsconfig.json`, `eslint.config.mjs` (`no-explicit-any` en
`no-non-null-assertion` op error), `pnpm typecheck` in CI.

## L-WIN-07 Een test die een em-dash zoekt, een script met top-level `await`, en een gestopte batterij

**Symptoom.** De huisregel `no-em-dash` viel over zijn eigen test. Een `.ts`-script met top-level
`await` faalde onder tsx. Na het halverwege stoppen van een batterij bleven Semgrep-processen
doorlopen en liet een afgebroken e2e proefdata en een server achter.

**Oorzaak.** Het teken zelf of de escape ervan in een testbestand is een em-dash in de repo. tsx
compileert `.ts` naar CommonJS, en daar bestaat top-level `await` niet. Op Windows stoppen de
kinderen van een gestopt proces niet mee.

**Regel.** Een em-dash in een test schrijf je als `String.fromCodePoint(0x2014)`, nooit als teken en
nooit als escape. Een script met top-level `await` heet `.mts`, of woont in een functie (zoals
`runScript`). Een batterij stop je alleen vóór de databasechecks en de e2e, en je ruimt de
achtergebleven processen op.

**Afgedwongen door.** `scripts/house-rules/rules.test.mjs` doet het zo; `scripts/lib/run.ts` geeft
elk script een functie; verder afspraak.
