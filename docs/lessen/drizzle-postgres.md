<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Lessen: Drizzle en Postgres

Drizzle 0.45 met drizzle-kit 0.31 op Postgres. Over migraties, de query builder, rauwe SQL,
transacties en wachtrijen. De vorm van elke les staat in [README.md](README.md).

## L-DRZ-01 Gegenereerde migraties niet aanraken, en er nooit met de hand een bijzetten

**Symptoom.** Een kolom die met de hand in een gegenereerd `.sql`-bestand was gezet, kwam bij de
volgende `db:generate` terug als tweede migratie. Twee handgeschreven migraties met een tijdstempel
in de toekomst lieten latere migraties zonder foutmelding overslaan.

**Oorzaak.** drizzle-kit vergelijkt het schema met de laatste snapshot in `migrations/meta/`, niet
met de SQL. De loper kiest openstaande migraties op `when > laatste created_at`; een verzonnen `when`
in de toekomst houdt alles erna tegen tot de klok erlangs is.

**Regel.** Schema wijzigen in TypeScript en `pnpm db:generate` draaien. Wat drizzle niet kan
uitdrukken (extensies, exclusion constraints, partiële indexen, triggers, `REVOKE`) gaat via
`pnpm db:generate --custom --name=<naam>`: drizzle levert dan snapshot en journalregel, de inhoud is
van jou. Ging het toch mis: `check:drift` laten genereren, het nieuwe `.sql` weggooien, de nieuwe
snapshot hernoemen naar het nummer van de handgeschreven migratie, de extra journalregel weghalen,
de `prevId`-keten nalopen en opnieuw `check:drift`.

**Afgedwongen door.** `pnpm check:drift` (`scripts/check-drift.mjs`: draait drizzle-kit generate met
een onbereikbare database-URL en vergelijkt de git-status van de migratiemap voor en na) en
`pnpm check:migrations` regel 1 en 3 (geen journalregel zonder bestand, geen bestand zonder
journalregel), allebei in `ci.yml`. De toelichting staat in `lib/db/migrations/README.md`.

## L-DRZ-02 Een uitgevoerde migratie wijzig je nooit meer

**Symptoom.** Na een aanpassing aan een al uitgevoerde migratie kon niemand meer een formulier
indienen: `SQLSTATE 42703, record "new" has no field ...` uit een trigger, alleen op de database
waar de oude versie had gedraaid.

**Oorzaak.** Een uitgevoerde migratie staat in `drizzle.__drizzle_migrations` en draait nooit
opnieuw. De verbetering bereikte die database niet, terwijl een latere migratie ervan uitging. Op de
dev-branch was teruggedraaid en opnieuw gedraaid, dus daar werkte het.

**Regel.** Altijd een nieuwe migratie, ook als de vorige van vandaag is en alleen op je eigen branch
stond. Een reparatiemigratie herhaalbaar schrijven (`CREATE OR REPLACE`, `DROP TRIGGER IF EXISTS`),
zodat hij op elke database mag draaien en op een gezonde niets verandert.

**Afgedwongen door.** `check:migrations` regel 6: een `.sql` die op de merge-base met `main` al
bestond en sindsdien is gewijzigd, is een fout. Vergeleken met de werkmap, dus de regel gaat al af
vóór de commit. Zonder git-repository slaat hij over en zegt dat.

## L-DRZ-03 Eén transactie per migratiebestand, en een nieuwe enumwaarde pas gebruiken in de volgende

**Symptoom.** Een preview-build op een verse database faalde met `unsafe use of new value of enum
type`, terwijl dezelfde migraties op de bestaande dev-branch goed waren gegaan.

**Oorzaak.** `drizzle-kit migrate` en `migrate()` uit drizzle-orm draaien alle openstaande
migraties in één transactie, en Postgres verbiedt het gebruik van een enumwaarde in de transactie
waarin hij is toegevoegd. Alleen een database die alles in één keer inhaalt loopt erop.

**Regel.** Een eigen migratieloper, gedeeld door `db:migrate` en `db:deploy`, die elk bestand in een
eigen transactie draait en de boekhouding van drizzle aanhoudt (dezelfde tabel, sha256 over de ruwe
bestandsinhoud), zodat een database die eerder met drizzle-kit is bijgewerkt gewoon verderloopt.
Enumwaarde toevoegen en gebruiken in twee migraties. In een view of constraint die een net
toegevoegde waarde noemt, vergelijken op `kolom::text`. Bij een mislukte migratie Postgres-code,
detail en hint printen, niet alleen "Failed query".

**Afgedwongen door.** `scripts/lib/migrate.ts` (de loper) met `scripts/lib/migrate.test.ts` (de hash
is gelijk aan die van drizzle), en `check:migrations` regel 5 (`ADD VALUE` plus gebruik in hetzelfde
bestand).

## L-DRZ-04 Elke migratie een terugweg met dezelfde naam, heen-terug-heen bewezen

**Symptoom.** De eerste migratiecheck in een CI faalde per definitie zodra er migraties waren en
controleerde dus niets. Een down-bestand met alleen commentaar lijkt een terugweg maar doet niets.

**Oorzaak.** Een terugweg die ontbreekt of leeg is, merk je pas op het moment dat je hem nodig hebt.

**Regel.** Bij elke migratie `lib/db/migrations/down/<zelfde naam>.sql` met echte statements.
`pnpm db:down` draait er één per keer in een transactie, bepaalt de positie uit het aantal
toegepaste rijen (niet uit de laatste journalregel) en haalt de rij uit de migratietabel. Extensies
niet droppen in een down. Vóór de PR op een wegwerpbranch heen, terug, heen. Staat er echte data in,
dan is de weg vooruit een nieuwe migratie en niet de terugweg.

**Afgedwongen door.** `check:migrations` regel 2, 3 en 4 (aanwezig, geen wezen, niet leeg).
`db:down` stopt en noemt de verwachte bestandsnaam. `pnpm db:roundtrip` doet heen, terug en heen in
één opdracht op de dev-branch; dat je hem draait voor de PR is afspraak (Definition of done).

## L-DRZ-05 Hernoemen is voor drizzle een drop plus een add

**Symptoom.** Een gegenereerde migratie voor een hernoemde kolom ziet er normaal uit maar bevat
`DROP COLUMN` en `ADD COLUMN`: dataverlies.

**Oorzaak.** drizzle-kit herkent een hernoeming alleen via een interactieve vraag, en in een script
of in CI antwoordt niemand. De driftcheck neemt na zestig seconden aan dat generate op invoer wacht.

**Regel.** Elke gegenereerde migratie lezen voor je hem draait. Hernoemen via uitbreiden en
inkrimpen: nieuwe kolom nullable, data kopiëren in een eigen migratie, code omzetten en uitrollen,
oude kolom droppen in weer een eigen migratie. Een verplichte kolom: nullable toevoegen, vullen, dan
`not null`. Een nieuwe constraint eerst tegen de bestaande data controleren, anders faalt de
migratie halverwege. Voor de modules van het template geldt hetzelfde tussen schemaversies
(`template/README.md`, regel 4).

**Afgedwongen door.** Alleen afspraak, plus de timeout in `check:drift` die een hangende vraag
zichtbaar maakt.

## L-DRZ-06 Een kolom van de buitenste query in een sql-subquery wijst stil naar de binnenste tabel

**Symptoom.** Een overzicht vulde zich netjes met nullen of met waarden van een willekeurige rij. Een
variant met twee tabellen viel om op `column reference is ambiguous`. Dezelfde regel code werkte wel
zodra er een join in de buitenste query stond.

**Oorzaak.** Drizzle schrijft `${tabel.kolom}` in een sql-template alleen met tabelnaam als de
buitenste query een join heeft. Zonder join wordt het `"kolom"`, en Postgres bindt dat in een
subquery aan de dichtstbijzijnde tabel met die kolom: die van de subquery. `x.parent_id = "id"`
vergelijkt dan met zichzelf.

**Regel.** In een sql-fragment met `select` of `exists (` de kolom van de buitenste tabel letterlijk
uitschrijven met tabelnaam (`parents.id`), nooit als `${parents.id}`. Waarden en hele tabellen mogen
wel geïnterpoleerd worden. Tellingen in een controlescript vergelijken met een losse telling, zodat
ook de stille variant opvalt.

**Afgedwongen door.** Huisregel `subquery-columns` in `pnpm lint`
(`scripts/house-rules/subquery-columns.mjs`): zoekt `${tabel.kolom}` van een schematabel in een
sql-template met een subquery.

## L-DRZ-07 `and()` zet haakjes om het geheel, niet om een rauw fragment met `or`

**Symptoom.** Een persoonlijk scherm kon de gegevens van een collega tonen.

**Oorzaak.** Een rauw sql-fragment `a is null or a >= x` binnen `and(eq(...), ...)` werd
`(... and a is null or a >= x)`. De `or` bond losser dan de rest, dus het filter op persoon gold maar
voor de helft.

**Regel.** Liever `or()` uit drizzle dan rauwe SQL. Een rauw fragment met `or` altijd zelf tussen
haakjes. Autorisatiefilters in rauwe SQL extra kritisch lezen, en het controlescript van het domein
laat een tweede persoon de query uitvoeren (patroon `checkscript`).

**Afgedwongen door.** Alleen afspraak. In een eerder project gevonden in een code review, niet door
een check.

## L-DRZ-08 Databasefouten herkennen aan SQLSTATE op `error.cause`, en de melding niet naar buiten sturen

**Symptoom.** Een dubbele code gaf een 500 in plaats van "bestaat al". Een logregel zei welke
kolommen in de insert zaten maar niet waarom hij werd geweigerd. De foutmelding bevatte wat een
gebruiker had getypt.

**Oorzaak.** Drizzle gooit een eigen `Error` waarvan `message` de mislukte query plus parameters
is. Code en constraintnaam zitten op `error.cause`, de Postgres-fout. `message.includes("naam")`
compileert en werkt nooit. Een exclusion constraint geeft `23P01`, geen `23505`.

**Regel.** Eén module die de cause-keten afloopt en matcht op SQLSTATE plus constraintnaam. Voor
logs een beschrijving met code, melding, detail en constraint, zonder parameters. Een ruwe
Drizzle-melding gaat nooit ongefilterd naar een gebruiker of een externe dienst (zie L-WERK-08).

**Afgedwongen door.** `lib/db/errors.ts` (`dbErrorInfo`, `isUniqueViolation`,
`isExclusionViolation`, `describeDbError`) en `lib/monitoring/report.ts` (`scrubMessage`). Niet
door lint.

## L-DRZ-09 Wat `db.execute` teruggeeft

**Symptoom.** `rows.map is not a function`. Elders gaf een cast `(result as {rows?}).rows ?? []`
bij een andere vorm stil nul rijen, en rekende een alarm verder met niets.

**Oorzaak.** De serverless driver van Neon geeft bij `db.execute` een resultaatobject met `.rows`,
geen array. Rauwe rijen zijn ongetypeerd: `bigint` en `numeric` komen als string, een timestamp
soms als string. `UPDATE ... RETURNING` geeft geen gegarandeerde volgorde.

**Regel.** `rowsOf<T>(result)` die hard faalt als `.rows` geen array is. Waarden in rauwe rijen
expliciet omzetten (`Number`, `BigInt`, `new Date`). Na `RETURNING` zelf sorteren. Waar het kan de
query builder gebruiken. Geld als `bigint` met `mode: "bigint"`, rekenen met `BigInt`, nooit
`parseFloat` (patroon `geld-in-centen`).

**Afgedwongen door.** `lib/db/rows.ts`, en ESLint met `no-non-null-assertion` en `no-explicit-any`
op `error`.

## L-DRZ-10 De databaseclient: lui, één codepad, transacties doorgeven

**Symptoom.** `next build` faalde in CI zonder `DATABASE_URL`.

**Oorzaak.** Een geëxporteerde `db`-constante bouwt de pool bij het importeren, en `next build`
importeert elke pagina om de routes te bepalen.

**Regel.** `getDb()` die pas bij de eerste query verbindt: een build heeft geen database nodig. Eén
codepad naar de database: geen repository-abstractie, geen mock, geen in-memory fallback.
Domeinfuncties nemen `DbOrTransaction` (het transactietype van drizzle wijkt af van dat van de db),
zodat dezelfde functie binnen en buiten een transactie werkt. De audit log in dezelfde transactie
als de mutatie. `closeDb()` alleen voor scripts.

**Afgedwongen door.** `lib/db/client.ts` (`getDb`, `closeDb`, `DbOrTransaction`) en `lib/db/audit.ts`.
CI bouwt zonder `.env.local`, dus een module die bij import verbindt laat de build vallen.

## L-DRZ-11 Een view met `select *` bevriest zijn kolomlijst

**Symptoom.** Een nieuwe kolom op de basistabel stond wel in het drizzle-viewobject, maar de eerste
query via de view faalde met `column does not exist`. De verleiding was die query terug te zetten op
de basistabel, waarmee een bewust filter verdween.

**Oorzaak.** Postgres vouwt `*` uit bij het aanmaken van de view en bewaart de kolomlijst.

**Regel.** Views alleen waar ze een gevaarlijke standaard omdraaien (zoals "geplande rijen tellen
nergens mee"), niet als gemak. Bij elke nieuwe kolom op de basistabel een migratie die de view dropt
en opnieuw maakt. In drizzle `pgView(...).existing()` met de kolommen voluit, zodat de compiler een
overgezette query controleert.

**Afgedwongen door.** Niets in de kern: het template heeft geen views. Een project dat er een maakt,
zet in zijn controlescript een vergelijking van de kolomlijsten van tabel en view uit
`information_schema`.

## L-DRZ-12 Zacht verwijderen en een unieke index

**Symptoom.** Een naam of code was na verwijderen nooit meer te gebruiken, en in de UI kwam je er
niet uit. Testopruiming met `deleted_at` liet de volgende run op dezelfde unieke index stuklopen.

**Oorzaak.** Een gewone unieke index telt zacht verwijderde rijen mee.

**Regel.** Per unieke index bewust kiezen: partieel met `where deleted_at is null` (hergebruik kan,
terugzetten kan botsen en vraagt dan een nieuwe naam) of volledig (de naam blijft gereserveerd).
Testdata hard verwijderen. Gedeelde kolomhelpers voor `id`, `created_at`/`updated_at` en
`deleted_at`, zodat `not null` op `updated_at` niet per tabel vergeten wordt.

**Afgedwongen door.** De partiële unieke index zelf, `lib/db/schema/columns.ts` (`primaryKeyColumn`,
`timestamps`, `softDelete`) en de opruimhelpers in `e2e/helpers.ts`, die hard verwijderen. Patroon
`zacht-verwijderen`.

## L-DRZ-13 Een mislukt statement breekt de hele transactie af

**Symptoom.** In een controlescript faalde na één bewust uitgelokte constraintschending alles erna,
met een fout die niets met de geteste regel te maken had.

**Oorzaak.** Na een fout staat een Postgres-transactie in aborted-stand en weigert hij elk volgend
statement tot rollback.

**Regel.** Controlescripts tegen een echte branch: alles in een transactie die aan het eind
terugrolt, elke verwachte weigering in een eigen savepoint (geneste `db.transaction`). Er blijft
nooit iets achter en de scripts kunnen na elkaar op dezelfde branch.

**Afgedwongen door.** `scripts/lib/check.ts` (`inRollback`, `attempt`, `expectDbError`); elk
`check:*`-script van het template gebruikt ze. Patroon `checkscript`.

## L-DRZ-14 Een wachtrij opeisen in één statement, met een lease

**Symptoom.** Berichten gingen twee keer de deur uit, elk heel uur. Bij meerdere ontvangers kreeg
alleen de eerste zijn mail.

**Oorzaak.** Een ronde las de wachtende rijen, verstuurde, en zette pas daarna de stand om, dus twee
rondes tegelijk pakten dezelfde rijen. `onConflictDoNothing` liet elke rij na de eerste stil
verdwijnen omdat de idempotentiesleutel de ontvanger niet bevatte.

**Regel.** Opeisen met `update ... set claimed_until = now() + interval where id in (select ... for
update skip locked limit n) returning ...`. Na versturen of mislukken `claimed_until` leegmaken.
Valt een ronde om, dan verloopt de lease vanzelf. Unieke index op de idempotentiesleutel, en de
sleutel bevat gebeurtenis, niveau en ontvanger. Een mislukte rij weer op `pending` zetten als iemand
opnieuw op de knop drukt, anders blokkeert de sleutel ook het herstel.

**Afgedwongen door.** Module jobs: `lib/jobs/lease.ts` (`claimRows`, de ene query voor elke
wachtrij) en de unieke index op `idempotency_key`; de outbox van module messaging gebruikt dezelfde
lease. `pnpm check:jobs` draait twee rondes na elkaar en bewijst dat de tweede niets van de eerste
krijgt. Patroon `idempotentie-en-lease`.

## L-DRZ-15 Een uuid vergelijkt Postgres zonder hoofdletters, JavaScript niet

**Symptoom.** In een eerder project zette iemand zijn eigen recht, terwijl de code "nooit jezelf"
zei. Hij stuurde zijn eigen id in hoofdletters mee.

**Oorzaak.** Het id uit het formulier ging ongewijzigd naar de query, en daar is `B57CBC18-...`
dezelfde rij als `b57cbc18-...`. Het slot ervoor vergeleek met `===` tegen `actor.id`, en dat zei
"iemand anders".

**Regel.** Een id tegen `actor.id` altijd met `sameId(a, b)`, nooit met `===` of `!==`. Of een id
de goede vorm heeft, met `isUuid`; of hij van jou is, in de query.

**Afgedwongen door.** `lib/domain/ids.ts` met test, en de huisregel `same-id`.

## L-DRZ-16 De reden van een mislukte query zit in `cause`, de parameters in de melding

**Symptoom.** In de log stond alleen "Failed query: insert into ...", of juist de query met op de
tweede regel een e-mailadres en een naam. Op een beheerscherm stond de querytekst.

**Oorzaak.** Een mislukte query is een `DrizzleQueryError`: de query en de parameters in `message`,
de fout van Postgres in `cause`. `String(error)` en `error.message` geven dus de parameters en niet
de reden.

**Regel.** Naar de log met `errorForLog(error)`, naar een scherm of een kolom die een scherm toont
met `errorForScreen(error)`. Nooit `error.message` van een databasefout in een `console.error`.

**Afgedwongen door.** `lib/monitoring/error-text.ts` met test; `reportError` maakt de rest schoon.
