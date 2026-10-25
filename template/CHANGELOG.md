<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Changelog van het template

Per versie: wat verandert, wat kan botsen bij het bijwerken van een project, en wat een project
daarna met de hand moet doen. `pnpm template:update` toont de secties tussen de oude en de nieuwe
versie na het bijwerken.

## Nog niet uitgebracht

### Wat verandert

- Nog niets.

### Let op bij bijwerken

- Nog niets.

## v1.4.0 (25 oktober 2026)

### Wat verandert

- **Een sessie verloopt acht uur na het inloggen, ook als hij steeds ververst wordt.** Auth.js tekent
  het token bij elke sessieaanvraag opnieuw, dus `maxAge` alleen schoof mee en een sessie leefde
  eindeloos door met de rollen van het inlogmoment. Nu staat `loginAt` op het token en geeft de
  jwt-callback `null` na acht uur (`lib/auth/session-age.ts`, met test).
- **Een login neemt een bestaand account alleen op e-mailadres over als dat een dev-account uit de
  seed is.** Een tweede identiteit met dezelfde e-mailclaim kreeg anders de rij, de rollen en de
  historie van een ander; nu weigert de login met een melding in de serverlog
  (`lib/auth/email-fallback.ts`, met test).
- **De dev-login werkt alleen met `APP_ENV=local`.** Het slot op `VERCEL_ENV` faalde open op elke
  andere host. `lib/domain/deploy-environment.ts` bepaalt de omgeving (eerst `APP_ENV`, dan
  `VERCEL_ENV`, anders onbekend) en elke guard kiest bij "onbekend" de veilige kant: de dev-login
  gooit, de deploy-migratie controleert altijd behalve in productie, de seed weigert in een deploy.
  Beheer, Systeem toont de omgeving, de e2e zet `APP_ENV=local`, en `pnpm doctor` meldt een
  `APP_ENV` die niet bij de dev-login past.
- **Module auth-password: de GCM-tag van het TOTP-geheim is altijd 16 bytes**, bij versleutelen en
  openen; een kortere tag wordt geweigerd. Bestaande geheimen hebben al 16 bytes.
- **`requestOriginVerdict`** (`lib/domain/request-origin.ts`, met test): de herkomstcontrole die
  server actions van Next krijgen, voor een route handler die schrijft en op de sessiecookie leunt.
  Het template heeft er nog geen; het kernblok van `CLAUDE.md` zegt dat zo'n handler ermee begint.
- **CI**: elke action op een vaste commit-SHA met de versie als commentaar, `permissions: contents:
  read`, en twee nieuwe jobs: "Kwetsbaarheden en geheimen" (`pnpm audit --prod --audit-level=high`
  en `pnpm check:secrets` met secretlint) en Semgrep als advies (`continue-on-error` tot de eerste
  run beoordeeld en groen is). Drie nepverbindingsstrings in de code hebben een uitzondering met de
  reden erbij.
- **`.github/dependabot.yml`**: elke maandag één gegroepeerde pull request voor minor en patch, zeven
  dagen na de release (`cooldown`), majors van pakketten die samen moeten bewegen genegeerd, en de
  actions samen in één eigen pull request. Een security-update komt meteen.
- **`pnpm check:all`** bestaat nu: de hele batterij, goedkoopste eerst, rechtstreeks met `node` (nooit
  genest `pnpm`), met een tabel voor de rubriek Bewijs. Stappen tegen de database draaien als
  `.env.local` een database noemt, en worden anders zichtbaar overgeslagen (exitcode 2).
- **Ontwikkeltooling**: vitest 4.1.12 en een override voor vite 8.3.4 of hoger. `pnpm audit` toont
  daarna alleen nog de bekende matige melding op esbuild onder drizzle-kit.
- **Handleidingen**: 03, stap 5 noemde een optie die Vercel niet heeft; nu een opdracht onder Ignored
  Build Step die alleen `main` en `release/next` bouwt, zodat een branch van Dependabot geen build
  en geen database kost. 04 ruimt oude databasebranches op, 02 zet Dependabot security updates en
  het opruimen van gemergde branches aan en zegt hoe je een pull request van Dependabot meeneemt, 07
  en 06 noemen `APP_ENV`, 09 heeft een rij voor een eerste build zonder eigen database, en
  WERKWIJZE, 00, 30 en de lessen in `authjs.md` en `werkwijze.md` volgen.

### Let op bij bijwerken

- **Iedereen logt na de uitrol één keer opnieuw in**: een bestaande cookie heeft nog geen
  inlogmoment en telt als verlopen.
- **Zet `APP_ENV=local` in `.env.local`**, anders start de app lokaal niet zolang
  `AUTH_DEV_LOGIN=1` staat. `vercel env pull` haalt hem weer weg; `pnpm doctor` meldt het. Op Vercel
  verandert niets. Draait een project op een andere host, zet daar dan `APP_ENV=production` of
  `preview`.
- **`pnpm install`** na het bijwerken: secretlint en vitest zijn nieuw of nieuwer.
- **Vercel**: zet Ignored Build Step op de opdracht uit handleiding 03, stap 5. **Neon**: zet
  Automatically delete obsolete branches aan (04, stap 3). **GitHub**: zet Dependabot security
  updates en Automatically delete head branches aan (02, stap 4).
- **Controleer bij de eerste ronde** of de eerste build van `release/next` een eigen databasebranch
  in Neon krijgt. Zo niet, dan houdt de guard hem tegen; open dan de pull request en klik op
  Redeploy (handleiding 09). Dat gedrag is nog niet op een echt project nagelopen.
- Staat er al een gebruiker met hetzelfde e-mailadres maar een andere identiteit, dan lukt inloggen
  voor de tweede niet meer; de serverlog zegt wat je doet als het toch dezelfde persoon is.
- Dependabot opent op maandag zijn eerste pull requests. Neem ze mee in een ronde, niet los mergen.

## v1.3.0 (24 oktober 2026)

### Wat verandert

- **Beveiliging: Next.js 16.4.2** (en `eslint-config-next` 16.4.2). Next 16.3.6 had twee kritieke
  kwetsbaarheden zonder inlog (remote code execution via de Image Optimization API en via
  `use cache`, GHSA-2464-fhr4-w9xw), een denial of service via server actions
  (GHSA-p3m5-59mp-jv5r, raakt elk project uit het template) en een SSRF in de Image Optimization
  API. Verder `nodemailer` 10.1.7 (drie fouten in het parsen van adressen) en een override voor
  `zod` 4.6.6 of hoger, die via de Anthropic SDK binnenkomt. `pnpm audit --prod` is daarmee
  schoon; wat overblijft zit alleen in de ontwikkeltooling.
- **De wizard en het lesmateriaal staan niet meer in het template.** De map `wizard/` (de wizard,
  de pagina's van de training, de feedbackpagina, de accounts, het controlescript voor de laptop en
  de huisstijl van de organisatie) is weg, met de bijbehorende scripts in `template/ci/`
  (`wizard-smoke.mjs`, `wizard-toegang.mjs`, `schermen-opnemen.mjs`, `controle-laptop.test.ts`)
  en de job in de template-CI. Ze staan in een eigen repo, die het template op een vastgezette tag
  ophaalt en test dat wat de wizard oplevert door `template:validate` komt. Het enige contract
  tussen de twee is `project.config.json`.
- **Het template is nu zonder uitzondering neutraal:** `check-template.mjs` kent geen plekken meer
  waar merknamen mogen.
- **De handleidingen staan op zichzelf.** 00, 01, 02, 07, 08 en 10 en `docs/modules/core.md`
  verwijzen niet meer naar bestanden of delen van de wizard. De voorbereiding eindigt met een
  controle van de versies (en na het klonen `pnpm doctor`), en handleiding 10 heeft een startprompt
  voor wie zonder wizard begint: `project.config.json` uit `examples/`, het projectplan, en één
  opdracht voor Claude.

### Let op bij bijwerken

- **Werk bij, ook als je verder niets nodig hebt:** deze versie dicht twee kritieke lekken in
  Next.js. Na `pnpm template:update` draai je `pnpm install`, en de volgende deploy zet het live.
- **`wizard/` verdwijnt uit je project.** `pnpm template:update` haalt elk bestand in `wizard/` weg
  dat je niet hebt gewijzigd. Een gewijzigd bestand blijft staan, met de melding "niet meer in het
  template"; haal het zelf weg als je het niet gebruikt. Hetzelfde geldt voor de vier scripts in
  `template/ci/`.
- Verwees je eigen documentatie naar `wizard/`, pas die dan aan.

## v1.2.0 (16 oktober 2026)

### Wat verandert

- **Module `ai`**, niet meer gereserveerd: Claude doet in de tool een voorstel in een vaste
  structuur, en een mens bevestigt. De prompts staan in `lib/ai/catalogue.ts` (van het project,
  begint leeg), elk met een sleutel, een versie, de volledige instructie, de velden die meegaan en de
  structuur van het antwoord. `runPrompt` is de enige plek die Claude aanroept: recht `ai:use`, de
  prompt aan met een model, de sleutel, de daglimiet per persoon per prompt, structured outputs, en
  het antwoord nog een keer nagekeken. `ProposalView` toont een voorstel altijd met dezelfde
  onderdelen. Onder **Beheer, AI** (recht `admin:ai`) kiest een beheerder per prompt aan of uit, het
  model, het denkniveau en de daglimiet, vult de prijzen per model in, en ziet het verbruik met de
  kosten per verzoek en per maand. Elk verzoek staat in `ai_requests` met tokens en de prijs van dat
  moment, nooit met de inhoud. Geen model, sleutel of bedrag in de code. Beheer, Systeem toont de stand
  zonder de API aan te roepen. Bewijs: `pnpm check:ai` en de tests onder `lib/ai/`; een proef met de
  echte sleutel is `pnpm ai:test -- <model>`. Uitleg in `docs/modules/ai.md`, inrichten in de nieuwe
  handleiding 24; de checklist (00), de startpagina (01) en het overzicht beveiliging en kosten (30)
  noemen hem. De eerste wizard noemt ai niet meer als gereserveerd: het label Dag 2 zegt dat hij er
  dan bij komt met `pnpm template:add ai`.
- **Twee rechten in core**: `admin:ai` en `ai:use`, met hun teksten. Een beheerdersrol krijgt ze
  vanzelf; een andere rol alleen als de matrix van het project ze geeft.
- **`@anthropic-ai/sdk` staat in de afhankelijkheden van core**, net als `nodemailer` en `qrcode`:
  het lockbestand moet kloppen voordat een module is toegepast. Een project zonder module ai laadt het
  pakket nooit.
- **`pnpm doctor`**: klopt deze werkmap? Node en pnpm, git en de commit-hook, het template tegen
  `project.config.json`, `.env.local` met de variabelen van elke toegepaste module, de database
  tegen `SEED_TARGET` en productie, en de koppeling met Vercel. Per regel OK, ACTIE of LATER met wat
  je doet, exitcode 1 bij een actie. Raakt geen database en toont nooit een waarde. Handleiding 07 en
  90 verwijzen ernaar.
- **De wizard voor de tweede trainingsdag**, `wizard/workshop-2.html`, in dezelfde stijl en vanaf de
  voet van de eerste wizard bereikbaar. Vier delen: Vooraf (thuis, met de Claude Console en een
  akkoord over gegevens), Dev en prod (een eigen database voor de laptop, previews met een eigen
  database, `release/next`, migraties en terugzetten, echte gegevens buiten productie), AI ontwerpen
  (toepassing, gegevens, vaste structuur, prompting met een oefening, testgevallen, een rekenhulp voor
  kosten zonder ingebouwde prijzen, en het waterverbruik met bronnen) en AI bouwen (de Playground met
  een scorekaart, een nieuwe functie als route, de AI-functie in de tool, onderhoud). De rooktest loopt
  hem door en bewijst dat wat hij oplevert neutraal is en geen em-dash bevat.
- **Labels "Dag 2" in de eerste wizard**, op de plekken waar de vraag al opkomt, met een link naar de
  stap van dag 2.
- **Inloggen op de wizard**, als drempel en niet als beveiliging: op de site vragen de wizard, de
  wizard van de tweede dag en de feedbackpagina eerst om een account, één per deelnemer, aan of uit.
  De accounts staan als code met een gezouten hash in `wizard/toegang.js` en worden beheerd met
  `node template/ci/wizard-toegang.mjs`; zonder accounts, en vanaf je eigen schijf, is er geen inlog.
  De rooktest bewijst het op een nagebootste site met testaccounts.
- **Terugdraaien in Vercel** (handleiding 90 en WERKWIJZE): Instant Rollback in plaats van Promote,
  met de waarschuwing dat Vercel na een rollback geen nieuwe versie vanzelf live zet tot Undo
  Rollback.
- De wizard toonde code binnen een vetgedrukt stuk met losse backticks; nu staat het er als code.

### Let op bij bijwerken

- **`pnpm install`** na het bijwerken: er is een nieuwe afhankelijkheid (`@anthropic-ai/sdk`).
- **De module ai erbij** gaat met `pnpm template:add ai`, dan `pnpm install` en `pnpm db:migrate`
  op de dev-branch (`pnpm db:roundtrip` voor de terugweg). Geef een rol die geen beheerder is het
  recht `ai:use` in `lib/auth/matrix.ts` als die rol voorstellen mag vragen. Daarna handleiding 24:
  een workspace met uitgavenlimiet in de Claude Console, `ANTHROPIC_API_KEY` in Vercel en in
  `.env.local`, de prijzen en per prompt het model onder Beheer, AI.

## v1.1.0 (15 oktober 2026)

### Wat verandert

- Na de eerste workshop (14 oktober 2026):
  - **De build migreert weer.** `vercel.json` krijgt `buildCommand: "pnpm db:deploy && pnpm build"`
    als standaardwaarde (in `template/lib/apply.ts`). Zonder dat draaide Vercel alleen `next build`,
    en migreerde noch productie noch een preview, terwijl D5 en de handleidingen 03 en 08 dat
    beloofden. Een project met een eigen `buildCommand` houdt het zijne.
  - **Tweestapsverificatie zonder mail.** Moet een beheerder het nog instellen, dan gaat hij na een
    goed wachtwoord in dezelfde stap door naar de pagina met de QR-code; de koppeling per mail is
    niet meer nodig. Zonder ingerichte mail sloot een beheerder zichzelf tot nu toe buiten. Elk nieuw
    instel-token geeft een vers geheim, zodat twee mensen met hetzelfde wachtwoord nooit dezelfde
    QR-code zien. Het geheim staat versleuteld met een sleutel uit de nieuwe variabele
    `MFA_SECRET_KEY` (anders `AUTH_SECRET`); gelijk in Production en Preview werkt tweestap ook op een
    preview. Een geheim onder de oude sleutel wordt bij de volgende inlog omgezet.
  - **Werken via `release/next`**: nieuwe handleiding 09, WERKWIJZE en het core-blok in CLAUDE.md
    stellen elke ronde voor op de vaste releasebranch met een preview en eigen database; direct op
    `main` is de uitzondering.
  - **De startprompt bevat de configuratie en het projectplan**, en Claude zet ze zelf neer. De
    downloads blijven als reserve.
  - **Voorbereiding**: `wizard/voorbereiding.html` (doorklikbaar, met vinkjes) en een controlescript
    voor de laptop (`wizard/controle-laptop.ps1` en `.sh`, met uitleg in `controle-laptop.md` en een
    test in `template/ci/controle-laptop.test.ts`). Handleiding 00 en 01 volgen dezelfde stappen.
  - Handleiding 05b: het eerste beheerdersaccount op productie aanmaken terwijl `.env.local` naar de
    dev-branch wijst. Handleiding 06: Sensitive kan niet voor Development.
  - `template/manifest.json` kent nu de bron (`source`), zodat `pnpm template:update` weet waar het
    template staat.
- Wizard na de workshop:
  - **Feedbackpagina** `wizard/feedback.html`: zet een openbaar issue `[Feedback] ...` klaar in de repo
    van het template, met mailen als alternatief; gelinkt vanaf de voet van de wizard.
  - **Eén ding mee: de startprompt.** Het eindscherm heeft één grote knop "Kopieer de startprompt",
    met een bevestiging en een terugval als het klembord niet mag (de tekst geselecteerd in een
    tekstvak). De persoonlijke checklist zit er nu als derde bestand in; Claude zet hem in
    `docs/handleiding/00-checklist-<slug>.md`. De vier losse downloads staan ingeklapt onder
    "Reserve: losse bestanden".
  - **Alle voorbereiding in de wizard**, één pagina in drie delen met voortgang per deel: A
    Voorbereiden, B Je tool ontwerpen, C Op de dag: live zetten (de acht stappen van de werkdia, met
    per stap wat je doet, hoe je ziet dat het gelukt is en wat je doet als het misgaat). De halve
    pagina uit deel A vult de velden van deel B; stap 3 kreeg daarvoor het veld Gevoelige gegevens,
    dat in kopje 10 van het plan komt. De opslag van deel B blijft `foundation-wizard:v1`; de vinkjes
    en de halve pagina van de oude voorbereidingspagina worden overgenomen.
    `wizard/voorbereiding.html` stuurt door naar `index.html#voorbereiden`.
  - **Schermafbeeldingen** per stap, beschreven in `wizard/schermen.json` en ingebed in de wizard,
    met kaders als HTML bovenop het plaatje; zonder plaatje een kader "Waar je klikt" met het klikpad in tekst.
    Het opnamescript `template/ci/schermen-opnemen.mjs` neemt de openbare pagina's op en, met een
    eigen browserprofiel buiten de repo, de schermen achter een login.
  - **De wizard in de huisstijl van de organisatie** (logo's en lettertypes in `wizard/brand/`).
    `check-template.mjs` staat de merknamen alleen toe in de wizard; de rooktest bewijst dat wat de
    wizard oplevert neutraal blijft.

### Let op bij bijwerken

- Wachtwoordlogin: een nog niet bevestigd tweestapsgeheim vervalt bij een nieuw instel-token. Wie
  halverwege het instellen zat, scant opnieuw.
- `vercel.json` krijgt `buildCommand` als die ontbrak. Staat er in het Vercel-dashboard al een eigen
  Build Command, controleer dan welke van de twee je wilt houden.

### Handwerk

- Projecten die vóór deze versie uit het template zijn gemaakt: zet in `project.config.json` onder
  `template` de regel `"source": "https://github.com/JBandB/bb_foundation_webapp.git"` en draai
  `pnpm template:apply`. Daarna werkt `pnpm template:update`.
- Wachtwoordlogin: zet in Vercel `MFA_SECRET_KEY`, dezelfde waarde in Production en Preview (maak hem
  zoals `AUTH_SECRET`, handleiding 06). Log daarna één keer in op productie; dan zet de tool je
  geheim om.
- Werk je lokaal nog tegen de productiedatabase: maak een dev-branch aan in Neon en zet die in
  `.env.local` (handleiding 04 en 07).

### Getest met

- Next 16.3.6, Node 24, pnpm 11.20.0.

## v1.0.0 (13 oktober 2026)

Uitgebracht zonder tag en zonder `template:release`: het manifest bleef op 0.1.0 staan. Een project
uit deze versie heeft daarom 0.1.0 in `template.lock.json` en werkt in één keer bij naar de
eerstvolgende tag.

### Wat verandert

- Ronde 0: het skelet. Toolchain met vastgepinde versies, huisregels (met drie nieuwe:
  `labels-size`, `no-config-import` en, vanaf ronde 6, `template-ownership`), de contrastcheck op
  `app/theme.css` plus `app/project.css` met de paren in `template/generators/contrast-pairs.json`,
  een neutraal thema in twee modi, de layout met zelf gehoste fonts, en de documentskeletten.
- Ronde 1: het fundament van de tooling. Een schemataal (`template/lib/dsl.ts`) die valideren,
  standaardwaarden en JSON Schema uit één beschrijving haalt; de vorm van `project.config.json`
  (`config-schema.ts`, met afgeleide velden en een geheimenwacht), van `template/manifest.json`
  (`manifest.ts`) en van `template.lock.json` (`lock.ts`); semver, kopregels, placeholders en
  git-wrappers; de vijf patchers voor `package.json`, `vercel.json`, `.env.example`, `CLAUDE.md` en
  `.gitignore`, elk bewezen idempotent; de opdrachten `template:validate` en `template:schema`; drie
  voorbeeldconfiguraties onder `examples/`; en de zelftest `template/self.test.ts`, die bewijst dat
  de wortel van het template precies is wat het manifest en de patchers ervan maken.
- Ronde 2: de kern van de database. Het schema van core (`organisations`, `users` met `external_id`,
  `audit_log`, `user_preferences`, `rate_limits`, `tool_feedback`), de client met luie verbinding,
  `rowsOf`, de foutherkenning op SQLSTATE, de audit log met `systemActor` uit de configuratie en een
  seed voor eigen handelingen (`lib/db/audit-actions.ts`), de schemastand voor Beheer, Systeem, de
  baseline-migraties `0000_core` en `0001_core_guards` (één organisatie, append-only trigger) met hun
  terugweg, de scripts `db:migrate|down|deploy|status|bootstrap|seed|roundtrip` met één migratieloop
  (elke migratie in een eigen transactie), het checkgereedschap `scripts/lib/check.ts` met
  `check:core` en het seed-voorbeeld `check:example`, en `check:migrations` en `check:drift` zonder
  database. De bewijzen tegen een echte database staan op de lijst in `template/README.md`.
- Ronde 3: de inlog en de schil. Auth.js met een JWT van acht uur, inlogmethoden als `LoginProvider`
  (de kern kent geen module bij naam: het gegenereerde register `lib/project/registry.generated.ts`
  levert ze aan, de dev-login komt er lokaal bij), rollen uit `roles.generated.ts` met `parseRoles`,
  rechten in `actions.core.ts` plus de seeds `actions.ts` en `matrix.ts` (een rol zonder regel
  compileert niet), `can()` met test, `currentActor` met actief-check en bij de wachtwoordlogin de
  rollen uit de database, de module auth-entra (provider, profiel, identiteit op `oid`), de teksten
  in twee talen, de UI-kit (panelen, zwevend venster, tabbladen, terugpijl, tabel met sorteren via
  de URL, velden, schuifje, chip, lege staat, skelet), de rail met modus en versie, het merk uit de
  configuratie, het inlogscherm, de foutpagina's, Over de tool uit de drie documenten, de feedbackknop
  met opslag in `tool_feedback`, en de e2e-basis (Playwright, global-setup, helpers, 00 tot 03).
- Ronde 4: Beheer en bewijs. De tabbladen Toegang (gebruikers en de rolmatrix als tabel), Systeem
  (versie, omgeving, schemastand, koppelingen uit `HEALTH_PROVIDERS`) en Feedback; de cronpoort
  `lib/cron/guard.ts` met de dagelijkse opruimcron en `task:prune` (stappen van het project in
  `lib/tasks/prune.project.ts`); `smoke:prod` dat de cronpaden uit `vercel.json` leest; `robots.txt`
  en een seed `security.txt`; e2e 04 en 05; en `check:core` bewijst nu ook dat `listStaff` zonder
  recht weigert.
- Ronde 5: de generatoren. Kleurrekenwerk in OKLCH zonder afhankelijkheden (`colour.ts`), de
  afleiding van een licht en een donker palet uit de acht merkkleuren met een reparatielus op de
  contrastparen (`palette.ts`), en de zeven gegenereerde bestanden: `app/theme.css`,
  `lib/brand/tokens.ts`, `lib/project/config.generated.ts`, `lib/auth/roles.generated.ts`,
  `lib/db/schema/template-index.ts` (uit `schemaFiles` in het manifest) en de twee registers (uit
  `registry` in het manifest). `pnpm template:generate` schrijft ze; de zelftest bewijst dat de
  wortel precies de uitvoer van de generatoren is. Nieuw in het manifest per module: `schemaFiles`
  en `registry`. Nieuw in `PROJECT`: `darkMode`; staat die uit, dan verdwijnt het schuifje en blijft
  alles licht.
- Ronde 6: apply en verify. `pnpm template:apply` past het template toe (`template/lib/apply.ts`):
  owned en generated bestanden worden overschreven als het project ze niet heeft aangeraakt (de
  hash in de lock), anders overgeslagen met een melding; seeds worden één keer neergezet; de vijf
  patchers doen de gedeelde bestanden; de lock wordt geschreven, met een `appliedAt` die alleen
  verandert als er iets anders veranderde. Opties `--dry-run`, `--force` (met een kopie in
  `.template-backup/`), `--strict` (exitcode 1 bij een overgeslagen bestand) en `--allow-dirty`.
  De seeds in de wortel zijn de neutrale versie uit `template/default.project.config.json`; zolang
  een project nog op die standaardconfiguratie staat, blijven ze staan, en bij de eerste apply met
  een echte configuratie worden ze gerenderd als het project ze nog niet had aangeraakt. Verder
  `template:status [--changes]`, `template:verify` (voor CI, nu ook in `ci.yml`),
  `template:adopt <pad> [--remove]` met de kop `template-adopted`, de huisregel
  `template-ownership`, en de gouden test `template/ci/golden.mjs` met `template-ci.yml`: een vers
  project uit de werkkopie per voorbeeldconfig, de batterij zonder database, en een tweede apply
  die niets mag veranderen. De rechtenmatrix `lib/auth/matrix.ts` is nu een seed met placeholder
  (`{{auth.matrix}}`), zodat een project met andere rollen dan admin en member meteen compileert.
  Owned tests nemen niets meer aan over de configuratie (rolnamen uit `APP_ROLES`, datumtekst via
  `PROJECT.locale`), want de gouden test draait ze ook in een project met Engelse interface en
  andere rollen. De e2e voor Beheer kiest de eerste rol zonder beheerrecht uit de configuratie.
- Ronde 7: de module jobs, de eerste opt-in module met een databaseschema. Tabel `jobs` (status
  pending, waiting, done, failed; `system` als tekst; idempotentiesleutel uniek; lease in
  `claimed_until`), `enqueueJob` met `on conflict do nothing` (queued, exists, revived), de ene
  claim-query met `for update skip locked` in `lib/jobs/lease.ts`, `processJobs` met de handlers
  van het project (`lib/jobs/handlers.ts`, een seed), `kickJobs` die de rij via `after()` direct na
  het antwoord verwerkt (op Vercel Hobby mag een cron maar één keer per dag), de cron
  `/api/cron/jobs` als vangnet met opruimen van afgehandeld werk, `pnpm task:jobs`, het tabblad
  Beheer, Achtergrondwerk met "Verwerk wat klaarstaat" en "Mislukte taken opnieuw" (met auditregel),
  de koppeling op Systeem, `pnpm check:jobs` en e2e `06-jobs.spec.ts`. Nieuw in de kern: het
  migratiepad in apply (`template/lib/drizzle.ts`): de migratie van een module wordt in het project
  gegenereerd met `drizzle-kit generate --name=template_<module>_<versie>`, na een driftcontrole en
  met de terugweg uit het manifest; staat de tag al in het journal, dan gebeurt er niets. Zonder
  `node_modules` zegt apply dat je na `pnpm install` nog een keer moet draaien. Verder twee nieuwe
  registers: `adminTabs` (tabbladen onder Beheer, `lib/project/admin-tab.ts`) en `labels` (de
  teksten van een module komen via `lib/i18n/template/modules.generated.ts` onder hun modulenaam in
  `labels`), en `lib/i18n/template/` staat per bestand in het manifest in plaats van als map, zodat
  een module er een bestand bij kan zetten.
- Ronde 8: de module messaging (vereist jobs). Tabellen `outbox` (kanaal mail of Teams, drie
  pogingen, lease) en `notification_settings`; de catalogus van berichtsoorten (`CORE_KINDS` in
  `lib/messaging/kinds.ts` plus `lib/messaging/catalogue.ts` van het project) met per soort het
  kanaal, de doelgroepen (`admins`, `person`, `role:<rol>`) en een drempel; `enqueueKind` als de ene
  manier om iets te melden, langs de instellingen van de beheerder; versturen gebundeld per
  ontvanger als HTML in de merkkleuren; twee transporten achter één contract (`messaging.transport`
  in de configuratie: SMTP met nodemailer, of Microsoft Graph uit een gedeelde postbus) en Teams via
  een webhook; de vastloopmelding `integration_stuck` over wachtrij en outbox; het hulpformulier
  "Lukt inloggen niet?" op het inlogscherm met honingpot en twee grenzen; Beheer, Berichten met de
  soorten, hun instelling in een zwevend paneel, het logboek met filter en opnieuw aanbieden; de
  cron `/api/cron/outbox`; `pnpm task:outbox`, `check:messaging`, `mail:test`, `teams:test`; e2e
  `07-messages.spec.ts`. In de kern: `lib/integrations/http.ts` (fetch met tijdslimiet),
  `claimRows` in `lib/jobs/lease.ts` als de ene lease-query voor elke tabel, en nodemailer als
  afhankelijkheid van de kern, zodat de lockfile hem kent en apply geen install vraagt.
- Ronde 9: de module auth-password (vereist messaging, gaat niet samen met auth-entra). Tabellen
  `credentials` (scrypt-hash met eigen zout, versleuteld TOTP-geheim, vergrendeling) en
  `auth_tokens` (eenmalige koppelingen: uitnodiging zeven dagen, herstel een uur, tweestapsverificatie
  instellen een kwartier; alleen de sha256 in de database). De Credentials-provider met één
  foutmelding voor onbekend, fout en vergrendeld, en twee aparte uitkomsten (code nodig, eerst
  tweestapsverificatie instellen via een koppeling per mail); rollen uit `users.roles`
  (`rolesFrom: "database"`). Schermen: het inlogformulier met het codeveld dat verschijnt als het
  nodig is, wachtwoord vergeten en herstellen, de uitnodiging aannemen, tweestapsverificatie
  instellen (QR als SVG via qrcode), Mijn account (wachtwoord wijzigen, 2FA aan of uit) via het nieuwe
  register `navItems`, en Beheer, Accounts (uitnodigen, rollen, deactiveren, 2FA resetten,
  herstelkoppeling) naast de leeslijst Toegang van de kern. `pnpm invite` maakt de eerste beheerder
  met een koppeling op het scherm, `pnpm check:auth-password` bewijst de sloten, e2e
  `09-password.spec.ts` de hele weg. Nieuw in `PROJECT`: `password.mfaRequiredFor`; nieuw in
  messaging: de soort `mfa_setup`; nieuw in de kern: het register `navItems` en qrcode als
  afhankelijkheid. Een labelregistratie kan met `as` een eigen sleutel kiezen (`labels.password`).
- Ronde 10: de module files. Tabel `files` (doel, entiteit, blobpad, naam, type, grootte, wie,
  zacht verwijderen), de blob-client zonder SDK (`lib/files/blob.ts`: PUT en GET met een SAS-token
  dat op de server blijft, de inhoud nagekeken op grens, type en eerste bytes, macro's geweigerd),
  de doelen van het project als seed (`lib/files/purposes.ts`, standaard `documents` met 4 MB), de
  rij-niveau-controle van het project als seed (`lib/files/authorize.project.ts`), `uploadFile`,
  `fileById`, `listFiles` en `removeFile` in `lib/files/store.ts` achter `files:read` en
  `files:write`, de downloadroute `/api/files/[id]` (401 zonder sessie, 404 voor wat niet bestaat of
  niet mag, als bijlage met `nosniff`), `FileInput` voor formulieren van het project, de koppeling op
  Systeem met de vervaldatum van het token (`BLOB_SAS_EXPIRES`), `pnpm blob:status` (een pixel erin
  en eruit), `pnpm check:files`, e2e `08-files.spec.ts`.
- Ronde 11: bijwerken en uitbrengen. `pnpm template:update [--to X.Y.Z] [--from <map>]` haalt een
  versietag van `template.source` op (of een map), start **de tooling uit die nieuwe versie** met dit
  project als werkmap (`apply --source`), en toont daarna de secties uit `template/CHANGELOG.md`
  tussen oud en nieuw. `pnpm template:add <module>` zet een module met wat ze vereist in
  project.config.json en past toe. `pnpm template:release X.Y.Z` (alleen in de templaterepo) zet de
  versie in het manifest omhoog, sluit "Nog niet uitgebracht" af als die versie en werkt de lock
  bij; de tag zet de mens. `template:status` doet een versiecheck tegen `template.source`
  (`--offline` slaat hem over). De updatetest `template/ci/update-test.mjs` (in `template-ci.yml`)
  bewijst zonder git-tags en zonder database: een owned bestand komt mee, een door het project
  gewijzigd owned bestand blijft staan en wordt gemeld, de lock en de tooling van het project krijgen
  de nieuwe versie, verify wijst het gewijzigde bestand aan, adopt lost het op, en een tweede update
  verandert niets.
- Ronde 12: de documenten voor Claude en voor de mens. `docs/THEME.md` (de themagids, generiek),
  `docs/WERKWIJZE.md` (het samenspel per ronde), `docs/modules/` (per module wat erin zit, wat het
  project levert, de variabelen en het bewijs, plus de gereserveerde modules), `docs/patronen/`
  (twintig patronen met een codevoorbeeld zonder domeinnamen) en `docs/lessen/` (79 lessen in negen
  lagen, elk met een vast anker zoals `L-DRZ-01`, symptoom, oorzaak, regel en afgedwongen door; de
  triggertabel in het CLAUDE-blok wijst ernaar). Drie stukken kern die de lessen noemen en die er
  nog niet waren: `lib/monitoring/report.ts` (`scrubMessage`, `describeError`, `reportError`: een
  serverfout verlaat de tool nooit met parameters, sleutelwaarden, mailadressen of tokens erin) met
  `instrumentation.ts` dat `onRequestError` van Next eraan hangt, en `lib/domain/csv-safe.ts` (BOM,
  puntkomma, CRLF, formules geneutraliseerd, scheidingsteken raden), allebei met tests. De
  hygiëneregel `template/ci/check-template.mjs` grept het template op de woorden in
  `template/ci/forbidden-words.txt` en op em-dashes, in `template-ci.yml`.
- Ronde 13: de handleidingen en de wizard. `docs/handleiding/` 01 tot 90 volgens één stramien
  (nodig, wat je aanmaakt, stappen met controle, waarom, beveiliging, kosten zonder bedragen, zo zie
  je dat het goed staat, als het misgaat, vul in), het stramien van de checklist (00), handleiding 10
  over het projectplan met een slecht en een goed voorbeeld per kopje, de seed `docs/PROJECTPLAN.md`
  met twaalf kopjes, `pnpm entra:status` voor de Microsoft-login, en `wizard/index.html`: één
  HTML-bestand zonder server dat `project.config.json`, het projectplan, de persoonlijke checklist en
  de startprompt oplevert (acht stappen, antwoorden in `localStorage` onder `foundation-wizard:v1`,
  een geheimenwacht met dezelfde vormen als `template/lib/config.ts`, een contrastvoorstel per
  kleurpaar). De kop van een HTML-bestand staat op regel 2, na de doctype; `template/lib/header.ts`
  en de huisregel kennen die plek. De rooktest `template/ci/wizard-smoke.mjs` opent de wizard vanaf
  `file://` in Chromium, vult de kinderboerderij-casus in, leest de vier downloads en haalt de
  configuratie door `template:validate` (42 controles); `template-ci.yml` draait hem in een eigen
  job. De SPEC-seed brengt nu de twaalf besluiten D1 tot en met D12 mee die het template oplegt
  (inlogmodule, één organisatie, Neon, Vercel, twee modi, versie per PR, git doet de mens, modules,
  UI-taal, kostenplafonds, GitHub zonder branch protection), elk met de prijs erbij; de startprompt
  van de wizard laat projectbesluiten bij D13 beginnen.

### Let op bij bijwerken

- Nog niets: er is geen eerdere versie.

### Handwerk

- Geen.

### Getest met

- Next 16.3.6, Node 24, pnpm 11.20.0.
