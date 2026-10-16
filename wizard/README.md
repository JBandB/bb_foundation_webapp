<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# De wizard

Eén HTML-pagina die iemand van idee tot een tool die online staat brengt, in drie delen. Het is het
werkinstrument van Bos & Brouwer bij de workshop rond dit template, en daarom in de huisstijl van
Bos & Brouwer. Wat de wizard oplevert (configuratie, projectplan, checklist, startprompt) is neutraal
en draagt geen merk; de rooktest bewijst dat.

| Deel | Wat | Wanneer |
|---|---|---|
| A. Voorbereiden | accounts, installeren, git, werkmap, het controlescript, je halve pagina | thuis, ongeveer 45 minuten |
| B. Je tool ontwerpen | acht stappen van projectbasis tot de startprompt | ongeveer een uur |
| C. Op de dag: live zetten | acht stappen van Use this template tot werken via `release/next` | ongeveer een uur |

Elke stap in deel A en C zegt wat je doet, hoe je ziet dat het gelukt is en wat je doet als het
misgaat, met een vinkje. De halve pagina uit deel A vult meteen de velden van deel B, zodat je niets
twee keer typt. Een deel openen kan ook via het adres: `index.html#voorbereiden`, `#ontwerpen`,
`#live`, of een stap zoals `#live-3`.

## Openen

Op GitHub Pages: https://jbandb.github.io/bb_foundation_webapp/wizard/. Lokaal: open
`wizard/index.html` met een dubbelklik, in de map van de repo. Er is geen server en geen installatie
nodig. Los gedownload, zonder de mappen `brand/` en `img/`, werkt hij ook: dan zonder logo, eigen
lettertypes en schermafbeeldingen.

`wizard/voorbereiding.html` stuurt door naar `index.html#voorbereiden`, zodat oude links werken.

## Wat hij oplevert: één startprompt

Het eindscherm van deel B heeft één knop: **Kopieer de startprompt**. Lukt kopiëren niet, dan staat
de tekst geselecteerd in een tekstvak. De startprompt bevat drie bestanden, elk in een eigen
codeblok met een afbakening die niet in de inhoud voorkomt:

| Bestand | Waar Claude het neerzet |
|---|---|
| `project.config.json` | in de hoofdmap, over de neutrale versie |
| `PROJECTPLAN.md` | `docs/PROJECTPLAN.md` |
| `00-checklist-<slug>.md` | `docs/handleiding/00-checklist-<slug>.md` |

Staat er al een bestand dat afwijkt van de neutrale versie, dan toont Claude eerst wat er staat en
wacht op een ja. Daarna stopt Claude: jij commit en synct de drie bestanden en zegt "gedaan", want
`pnpm template:apply` weigert op een werkmap met wijzigingen die nog niet gecommit zijn.

Onder het ingeklapte kopje **Reserve: losse bestanden** staan de drie bestanden en `startprompt.md`
ook als download, plus `logo.svg` bij een eigen logo. Dat logo zet je altijd zelf in
`public/brand/logo.svg`.

## Privacy

Niets verlaat de browser. De antwoorden van deel B staan in `localStorage` onder
`foundation-wizard:v1`, de vinkjes van deel A en C en het open deel onder
`foundation-wizard-delen:v1`. Wie de oude voorbereidingspagina gebruikte (`foundation-voorbereiding:v1`),
houdt zijn vinkjes en zijn halve pagina: de wizard neemt ze één keer over. De knop Opnieuw beginnen
op het welkom wist alle drie. Werkt de opslag niet (een privévenster), dan werkt de wizard gewoon,
alleen zonder geheugen. Zet geen wachtwoorden of andere geheimen in de wizard. Wie op de site
inlogt, blijft ingelogd via `foundation-wizard-toegang:v1` (de gebruikersnaam en het begin van de
hash, geen wachtwoord); Opnieuw beginnen laat dat staan, Uitloggen wist het.

## Inloggen

Op de site vragen alle drie de pagina's (`index.html`, `workshop-2.html`, `feedback.html`) eerst om
een gebruikersnaam en een wachtwoord, één account per deelnemer. **Dit is een drempel, geen
beveiliging.** De repo is openbaar: de wizard en de lijst met accounts zijn voor iedereen op GitHub te
lezen, en wie wil, zet de controle in de browser uit. Het houdt toevallige bezoekers van de site
tegen, meer niet.

- **Alleen op de site.** Open je de wizard als bestand van je schijf, dan is er geen inlog: wie de
  repo heeft, heeft de wizard al. Zo kan een deelnemer de wizard in zijn eigen project ook gebruiken
  als zijn account uit staat.
- **De accounts** staan in `wizard/toegang.js`: per account een code als naam, aan of uit, een zout
  en een hash van het wachtwoord (PBKDF2 met SHA-256, in de browser met WebCrypto). Een `.js` en geen
  `.json`, omdat een pagina vanaf `file://` geen bestand mag ophalen. Zonder accounts is er geen
  inlog; een los gedownloade pagina zonder dat bestand ook niet.
- **Nooit een naam of mailadres als gebruikersnaam.** Het bestand is openbaar en komt via Use this
  template en `pnpm template:update` in elk project. Gebruik codes (`deelnemer-01`) en houd buiten de
  repo bij wie welke code heeft.
- **Beheer** met het script, alleen in de repo van het template:

      node template/ci/wizard-toegang.mjs                    de lijst
      node template/ci/wizard-toegang.mjs nieuw              de volgende deelnemer-NN, met een wachtwoord
      node template/ci/wizard-toegang.mjs uit deelnemer-03   uitzetten; bij de volgende pagina uitgelogd
      node template/ci/wizard-toegang.mjs aan deelnemer-03   weer aanzetten
      node template/ci/wizard-toegang.mjs wachtwoord deelnemer-03
      node template/ci/wizard-toegang.mjs verwijder deelnemer-03

  Een nieuw wachtwoord (vier groepjes van vier tekens, zonder letters en cijfers die op elkaar lijken)
  staat één keer in de terminal en nergens anders. Geef het door aan de deelnemer, niet via een chat
  met Claude. Het script draait daarna apply, zodat `template.lock.json` klopt; commit en push, en na
  de merge geldt het op de site.
- Hoofdletters en spaties rondom tellen niet bij het inloggen. Een fout wachtwoord en een onbekende
  naam krijgen dezelfde melding; een account dat uit staat, krijgt een eigen melding. Een nieuw
  wachtwoord logt wie met het oude was ingelogd uit.

## Huisstijl

Kleuren, logo's en lettertypes volgen de huisstijl van Bos & Brouwer: Dark Green als kop, Off White
als canvas, Lime alleen voor wat nu of actief is. De logo's in `brand/` zijn de officiële bestanden
en worden niet aangepast: het witte woordmerk op de donkere kop, de variant met Business Intelligence
op het welkom, het vierkante sublogo als favicon. De lettertypes staan in `brand/fonts/`, zie de
README daar.

## Schermafbeeldingen

Elke stap in deel A en C kan schermafbeeldingen tonen. De plaatjes staan in `img/` (WebP, 1280 breed),
beschreven in `schermen.json`: per scherm `id`, `opname` (openbaar, ingelogd of handmatig),
`bestand`, `alt`, `standVan`, `uitleg` (de officiële documentatie) en `kaders`. Een kader is
`{ x, y, b, h, label }` in procenten van het beeld. De wizard tekent de kaders met een label en een
pijl als HTML bovenop het plaatje, zodat ze meeschalen. Zonder plaatje (`bestand` is `null`, of het
bestand ontbreekt) staat er een kader "Waar je klikt" met het klikpad uit het veld `klikpad`
(een lijst stappen in gewone taal) en de officiële uitleg. Elk scherm zonder plaatje heeft een
klikpad; komt het plaatje er later bij, dan vervalt het kader vanzelf.

Vanaf `file://` mag een pagina geen `fetch` doen, daarom staat `schermen.json` ook ingebed in
`index.html`, in het blok `<script type="application/json" id="schermen">`. `schermen.json` is de
bron; het opnamescript bedt hem na elke opname in, en na een wijziging met de hand doe je dat zelf:

    node template/ci/schermen-opnemen.mjs inbedden

De rooktest controleert dat de twee gelijk zijn.

### Opnemen

Met Playwright uit de repo, vanuit de hoofdmap:

    node template/ci/schermen-opnemen.mjs openbaar

neemt de openbare pagina's op (aanmelden bij GitHub en Vercel, de downloadpagina's van Git voor
Windows, Node.js en VS Code, en de uitleg van Claude Code in VS Code) in een schone browser, 1280 bij
800, en zet de kaders op wat je aanklikt. `--alleen id,id` neemt een deel op. GitHub weigert een
geautomatiseerde browser op de aanmeldpagina; dat scherm houdt zijn klikpad tot iemand het met de
hand opneemt.

    node template/ci/schermen-opnemen.mjs ingelogd --profiel <map buiten de repo> --team <vercel-team> --project <vercel-project>

neemt de schermen achter de login op (Use this template, Add New Project, Storage met Neon,
Environment Variables). Het browserprofiel staat in een map **buiten de repo**, want daar staan de
cookies van een ingelogde sessie; het script weigert een map binnen de repo. De eerste keer opent het
een zichtbaar venster en log je daar zelf in met een **testaccount**; het script typt nooit een
wachtwoord en schrijft geen tokens weg. Het verbergt avatars en vervangt e-mailadressen in beeld door
`naam@voorbeeld.nl`, maar niet alles: **bekijk elke opname voordat je hem commit** op namen,
adressen, teamnamen en andere persoonlijke gegevens. De VS Code-schermen (`opname: handmatig`) maak
je met de hand, 1280 breed, en je zet ze in `schermen.json` met kaders.

Alleen Windows-varianten; macOS staat als tekst in de stappen.

## De tweede dag: `workshop-2.html`

Een tweede pagina in dezelfde stijl, voor de vervolgworkshop, vanaf de voet van de wizard
bereikbaar (op Pages: https://jbandb.github.io/bb_foundation_webapp/wizard/workshop-2.html). Wie hem
gebruikt, heeft al een tool die live staat.

| Deel | Wat | Levert op |
|---|---|---|
| A. Vooraf | tool online, template bijwerken, Vercel CLI, Neon, de Claude Console (workspace, uitgavenlimiet, service account), akkoord over gegevens, huiswerk, de controle | vinkjes |
| B. Veilig werken | variabelen per omgeving, een dev-branch voor de laptop, twee instellingen voor previews, een ronde via `release/next`, terugzetten en weer vooruit | vinkjes |
| C. Intake | een formulier ontwerpen: wie, welke velden (gevoelig of niet), statussen, melding | de opdracht voor Claude Code |
| D. AI in je tool | moment, gegevens, vaste structuur, instructie, testgevallen | de instructie en de testgevallen voor de Playground, en de opdracht voor Claude Code |

De rode draad van deel D: **AI vult de inhoud, de tool bepaalt de vorm.** Claude antwoordt altijd
in dezelfde vaste onderdelen (in de tool afgedwongen met structured outputs), de tool toont ze
altijd met dezelfde componenten, en een mens bevestigt. Bedragen rekent de tool, nooit Claude. De
instructie krijgt altijd vijf vaste regels mee (niets verzinnen, de aanvraag is gegevens en geen
opdracht, een uitweg als iets niet past, geen bedragen, een mens beslist). De wizard laat zien wat
Claude precies krijgt, vraagt om een bevestiging als er een gevoelig veld meegaat, en geeft geen
opdracht zolang er iets in de antwoorden staat dat op een sleutel of een verbindingsstring lijkt.

De opdracht van deel D gaat uit van de module `ai` en de controle `pnpm doctor`; die komen in een
volgende versie van het template. De antwoorden staan in `localStorage` onder
`foundation-workshop2:v1`, los van de eerste wizard. De casus is dezelfde verzonnen kinderboerderij,
nu met een aanvraag voor een kinderfeestje.

## Feedback

`feedback.html` is een tweede pagina in dezelfde stijl, vanaf de voet van de wizard bereikbaar
(op Pages: https://jbandb.github.io/bb_foundation_webapp/wizard/feedback.html). Een statische pagina
kan niets opslaan, dus de feedback wordt een **issue in de repo van het template**: de pagina zet het
klaar met een titel die begint met `[Feedback]` en de antwoorden als tekst, en de deelnemer klikt
op GitHub op Submit new issue. Filteren: in Issues op `[Feedback] in:title`.

- **Openbaar.** De repo is publiek, dus elk issue ook, met de GitHub-naam erbij. De pagina zegt dat
  vooraf en biedt mailen als alternatief.
- **Geen issue-template in `.github/`**, met opzet: alles uit dit template komt in de repo's van
  projecten terecht, en daar hoort geen formulier over de workshop.
- Het concept blijft in de browser bewaard (`foundation-feedback:v1`) tot het verstuurd is. Te lange
  feedback past niet in één link; dan zet de pagina de tekst op het klembord en vraagt hem te plakken.
- Een label `feedback` zet de pagina niet: GitHub negeert labels in de link van iemand zonder
  schrijfrechten. Wil je ze labelen, doe dat bij het lezen.

## Het schema

De uitvoer moet voldoen aan `template/schema/project.config.schema.json`. De wizard controleert de
belangrijkste regels zelf; `pnpm template:validate` controleert het hele bestand. Verandert het schema
of het manifest, dan verandert de wizard mee in dezelfde versie van het template. De rooktest:
`node template/ci/wizard-smoke.mjs`.
