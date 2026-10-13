<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Lessen: uploads, downloads en CSV

Over uploadgrenzen, het contenttype, de koppen van een download en CSV die Excel goed opent. De
eerste drie horen bij module files; de vierde geldt voor elke export. De vorm van elke les staat in
[README.md](README.md).

## L-HTTP-01 Uploadgrenzen: Next en Vercel weigeren eerder dan jij

**Symptoom.** Uploaden boven één megabyte werkte niet. De gebruiker kreeg een frameworkmelding,
terwijl de eigen controle tien megabyte toeliet.

**Oorzaak.** Server actions zijn in Next standaard op 1 MB gemaximeerd. Daarboven neemt een
serverless functie op Vercel hoogstens 4,5 MB verzoekinhoud aan en weigert met 413 voordat je code
iets ziet.

**Regel.** Eigen grens op 4 MB (ruimte voor de rest van het formulier en multipart),
`experimental.serverActions.bodySizeLimit` ruim daarboven (`12mb`), zodat altijd de eigen controle
met een bruikbare tekst weigert. Lege bestanden weigeren. Groter: rechtstreeks van browser naar
opslag met een SAS voor precies één blob, een apart besluit.

**Afgedwongen door.** `lib/config/next-base.ts` (`bodySizeLimit`) en `MAX_UPLOAD_BYTES` in
`lib/files/blob.ts` van module files; `lib/files/purposes.ts` zet per doel een eigen, lagere grens.

## L-HTTP-02 Het contenttype is een bewering

**Symptoom.** Een geldige `.csv` werd geweigerd. Een hernoemd bestand zou binnenkomen als wat het
zegt te zijn.

**Oorzaak.** De browser leidt het type af uit de extensie. Windows meldt een `.csv` vaak als
`application/vnd.ms-excel`, en een onbekend type komt als `application/octet-stream` of leeg.

**Regel.** Per doel een korte toegestane lijst, geen blokkeerlijst. Alleen bekende vage gevallen op
extensie rechtzetten. Daarna de inhoud nakijken: magic bytes per type, een Office-bestand met
`vbaProject.bin` weigeren (macro's), een CSV zonder nulbytes en zonder binaire handtekening. Geen
pdf waar iets inline getoond wordt. Het vastgestelde type in de eigen database opslaan.

**Afgedwongen door.** `lib/files/blob.ts` van module files (typebepaling en inhoudscontrole) met
`blob.test.ts`, en de lijsten per doel in `lib/files/purposes.ts`.

## L-HTTP-03 Downloads via de eigen server, met de juiste koppen

**Symptoom.** Een download met een en-dash, euroteken of emoji in de naam gaf een 500. Een
doorverwijzing naar de opslag zou het SAS-token van de hele container in de adresbalk zetten.

**Oorzaak.** Een HTTP-kop mag alleen Latin-1 bevatten, en `new Headers()` gooit daarop. Een
opslag-URL met token is een sleutel.

**Regel.** Downloaden via een route handler (een server action kan geen bestand teruggeven) die de
rol controleert, het pad uit de database haalt binnen de eigen organisatie (nooit uit de query) en
de bytes doorstuurt. `Content-Disposition` via één helper met een ASCII-`filename` en
`filename*=UTF-8''<procent-gecodeerd>` (RFC 6266), regelovergangen eruit. `attachment` als
standaard, `inline` alleen voor afbeeldingen uit de toegestane lijst. Altijd
`X-Content-Type-Options: nosniff`, `Cache-Control` privé en kort, het type uit de eigen database.
Geen recht of geen geldige uuid is 404.

**Afgedwongen door.** `lib/files/content-disposition.ts` met zijn test en de route
`app/api/files/[id]/route.ts`, allebei in module files; `pnpm check:files` en `e2e/08-files.spec.ts`
bewijzen de weigeringen.

## L-HTTP-04 CSV voor Excel

**Symptoom.** Een naam met een trema werd een vraagteken. Een komma hakte bedragen in tweeën. Een
cel die met `=` begon, zou bij een ander als formule openen.

**Oorzaak.** Excel op Windows leest UTF-8 zonder BOM als Windows-1252. Een Nederlandse Excel
verwacht een puntkomma. Excel voert cellen die met `=`, `+`, `-` of `@` beginnen uit (CSV-injectie).

**Regel.** BOM vooraan, puntkomma als scheiding, CRLF, elk veld tussen aanhalingstekens met
verdubbelde interne aanhalingstekens. Formulestarts neutraliseren met een apostrof, behalve gewone
getallen, en bij het opnieuw inlezen van een eigen export die apostrof weghalen. Bij inlezen het
scheidingsteken raden uit de eerste regel.

**Afgedwongen door.** `lib/domain/csv-safe.ts` (`csvDocument`, `csvField`, `stripNeutralisation`,
`guessSeparator`) met zijn test; elke export van een project gaat daar doorheen.
