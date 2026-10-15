# Overdracht: het template, de wizard en de workshop

Voor de Claude-sessie die vanaf 15 oktober 2026 het template doorontwikkelt. Tot nu toe liep dit
werk mee in de sessie van het moederproject (de PM- en urentool van B&B, waar dit template uit
is gedestilleerd). Lees dit bestand, daarna `CLAUDE.md` en `template/README.md`. Haal dit
bestand weg zodra de nieuwe sessie zijn eigen geheugen heeft opgebouwd: het is een overdracht,
geen documentatie.

## Waar alles staat

| Wat | Waar |
|---|---|
| De repo (git) | deze map, `bb_foundation_webapp-1`, clone van `github.com/JBandB/bb_foundation_webapp` (publiek, gemarkeerd als template) |
| GitHub Pages | `https://jbandb.github.io/bb_foundation_webapp/wizard/` en `.../wizard/feedback.html`, vanaf `main` |
| De oude werkmap | `..\BB_foundation_webapp` (zonder git, met `node_modules`). Verouderd: niet meer in werken |
| Workshopmateriaal | `..\BB_workshop`: `WORKSHOP.md` (sectie 0 met de besluiten van 11 oktober, en de terugblik van 14 oktober), `VERVOLGSESSIE.md`, `claude-design\instructie-claude-design.md` met de logo's |
| Doorlichtingspakket | `..\BB_Foundation_interject` (geen git): een kale Claude licht een bestaande repo door in zes stappen; heeft sinds 14 oktober een harde stop bij Supabase |
| Het oorspronkelijke bouwplan | `~\.claude\plans\assess-the-file-input-datastructuur-elegant-gosling.md` (14 rondes, de besluiten van 2 oktober 2026) |

## Stand op 15 oktober 2026

Gecommit en gepusht op `main` (8f6f1a9, na `v1.0.0`). Nog **geen tag**: `pnpm template:update`
zoekt naar tags, dus zet `v1.1.0` op deze commit (dat doet Jorik). Wat er sinds v1.0.0 in zit,
staat in `template/CHANGELOG.md` onder "Nog niet uitgebracht"; `pnpm template:release 1.1.0` sluit
die sectie af.

Sinds de workshop gebouwd:

- **De build migreert weer**: `vercel.json` kreeg `buildCommand: "pnpm db:deploy && pnpm build"` als
  standaardwaarde (`template/lib/apply.ts`). Dat ontbrak, terwijl SPEC D5 en de handleidingen het
  beloofden.
- **Tweestapsverificatie zonder mail** (module auth-password): na een goed wachtwoord direct naar de
  QR-code; elk nieuw instel-token geeft een vers geheim; het geheim versleuteld met
  `MFA_SECRET_KEY` (anders `AUTH_SECRET`), gelijk in Production en Preview, met omzetting van oude
  geheimen bij de volgende inlog.
- **Handleiding 09**: werken via de vaste branch `release/next`, met een preview en een eigen
  Neon-branch per pull request. WERKWIJZE en het core-blok in CLAUDE.md volgen.
- **Handleidingen** 00, 01, 02, 05b (eerste beheerder op productie via een tijdelijk
  `.env.eerste-account`) en 06 (Sensitive kan niet voor Development) bijgewerkt.
- **De wizard** (`wizard/index.html`): één pagina in drie delen (A Voorbereiden, B Je tool
  ontwerpen, C Op de dag: live zetten), in de huisstijl van B&B, één uitkomst (de knop "Kopieer de
  startprompt", met config, plan en checklist erin), reserve-downloads ingeklapt. Vijf
  schermafbeeldingen met kaders als HTML erover; acht schermen hebben een tekstueel klikpad
  (`wizard/schermen.json`, veld `klikpad`). Opnamescript: `template/ci/schermen-opnemen.mjs`
  (modi `openbaar`, `ingelogd --profiel <map buiten de repo>`, `inbedden`).
- **Controlescript** voor de laptop: `wizard/controle-laptop.ps1` en `.sh`, met uitleg in
  `controle-laptop.md` en een test in `template/ci/controle-laptop.test.ts`.
- **Feedbackpagina** `wizard/feedback.html`: zet een openbaar issue `[Feedback] ...` klaar in deze
  repo, met mailen als alternatief. Bewust geen issue-template in `.github/` (dat komt anders in de
  repo's van projecten terecht) en geen label (GitHub negeert labels in de link van iemand zonder
  schrijfrechten).
- `template/manifest.json` kent zijn bron (`source`), zodat `template:update` weet waar het template
  staat.

## Werkafspraken die gelden

- **Jorik doet git.** De beveiliging van Claude Code blokkeert commits ook met toestemming in de chat.
  Lever op met de commando's erbij. De B&B-regel is: niet direct op `main`, maar via een branch
  (`release/next`) en een pull request.
- **Nederlands** voor alles wat een mens leest; code en identifiers in het Engels. **Nooit een
  em-dash**, ook niet in commentaar of commits. Geen bedragen in handleidingen of wizard.
- **De huisstijl van B&B alleen in de wizard-chrome** (`wizard/index.html`, `voorbereiding.html`,
  `feedback.html`, `README.md`, `wizard/brand/`). Alles wat de wizard oplevert en alles wat een
  project krijgt, blijft neutraal. `template/ci/check-template.mjs` bewaakt dat; de uitzondering
  staat daar met de reden.
- **Na elke wijziging aan een owned bestand** (met de kop `template-owned`): in de hoofdmap
  `node template/cli/bootstrap.mjs apply --allow-dirty`, zodat `template.lock.json` de nieuwe hash
  kent, en daarna `verify`. Een nieuw owned bestand zonder apply laat de huisregels falen.
- **Roep node direct aan**, niet via geneste pnpm-scripts: het pad van de gebruiker bevat een `&`.

## De batterij

```
node node_modules/typescript/bin/tsc --noEmit
node node_modules/eslint/bin/eslint.js .
node scripts/lint-house-rules.mjs
node template/ci/check-template.mjs
node template/cli/bootstrap.mjs verify
node node_modules/vitest/vitest.mjs run
node template/ci/wizard-smoke.mjs
node node_modules/next/dist/bin/next build
node template/ci/golden.mjs voorbeeld      (een vers project met wachtwoordlogin, een paar minuten)
```

De tests van de modules (`template/modules/**`) doen niet mee in de gewone vitest-run; de gouden
test draait ze in een toegepast project. Los draaien kan met een tijdelijke vitest-config in de
hoofdmap die `@/lib/auth/password/*` naar de module laat wijzen. Playwright-Chromium voor de
rooktest is op deze laptop geïnstalleerd (`node node_modules/@playwright/test/cli.js install
chromium-headless-shell` als hij ontbreekt).

Stand op 15 oktober 2026: alles hierboven groen (vitest 384, rooktest van de wizard met de
feedbackcontroles, gouden test op `voorbeeld`).

## Wat er openstaat

| # | Wat | Wie |
|---|---|---|
| 1 | Tag `v1.1.0` zetten (eventueel eerst `pnpm template:release 1.1.0`) | Jorik |
| 2 | Testaccounts voor GitHub en Vercel op een los adres, dan de vier schermen achter een login opnemen (`schermen-opnemen.mjs ingelogd`) en de drie VS Code-schermen met de hand | Jorik, dan Claude |
| 3 | Ronde 4 van het wizardplan: een klikproef door iemand die het nooit deed, met de tijd erbij | Jorik regelt een persoon |
| 4 | `check:auth-password` is nooit tegen een database gedraaid; daarvoor heeft het template een eigen Neon-project met een dev-branch nodig (ronde 14 van het bouwplan) | Jorik maakt het Neon-project, dan Claude |
| 5 | Mail aan de deelnemers van de workshop: dev-branch voor lokaal werk, tweestap pas aan met werkende mail (of na bijwerken van het template), en de regel `template.source` in `project.config.json` zodat `template:update` werkt (staat onder Handwerk in de CHANGELOG) | Jorik verstuurt |
| 6 | De presentatie bijwerken in de Claude Design-chat; de prompt staat in de vorige sessie en de werkdia in `..\BB_workshop\claude-design\instructie-claude-design.md` | Jorik |
| 7 | De vervolgsessie uitwerken (`..\BB_workshop\VERVOLGSESSIE.md`, met open vragen voor Jorik) | samen |
| 8 | Feedback uit de issues lezen en samenvatten: `[Feedback] in:title` | Claude, op verzoek |
| 9 | Het design system in claude.ai/design is vanuit Claude Code alleen bereikbaar na een eenmalige `/design-login` in een interactieve sessie | Jorik, als het nodig is |

## Lessen die je anders opnieuw leert

- Kopiëren van de oude werkmap naar de repo struikelt op te lange paden in `node_modules`: kopieer
  met robocopy en sluit `node_modules`, `.next`, `test-results` en `*.tsbuildinfo` uit, of werk
  gewoon in deze repo.
- De werkdia "Klaarzetten en live" volgt nu exact deel C van de wizard. Verandert de volgorde, werk
  dan wizard, handleiding 00 en 01, en de instructie voor Claude Design samen bij.
- GitHub weigert een geautomatiseerde browser op de aanmeldpagina; dat scherm blijft een klikpad of
  wordt met de hand opgenomen.
- Op de workshopdag kostte het klaarzetten twee uur in plaats van 50 minuten. Deel A van de wizard
  en het controlescript bestaan om dat vooraf thuis te laten gebeuren.
