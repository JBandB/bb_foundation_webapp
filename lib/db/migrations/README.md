<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Migraties

Twee soorten bestanden, en de regel die ze scheidt is niet-onderhandelbaar.

## Gegenereerd

Komt uit `pnpm db:generate --name=<naam>`, afgeleid van `lib/db/schema/`. **Nooit met de hand
aanpassen.** Drizzle vergelijkt het schema met de snapshot in `meta/`, niet met de SQL. Een
handmatige toevoeging in een gegenereerd bestand staat dus niet in de snapshot: de volgende
`db:generate` kent hem niet, ziet hem niet, en repareert hem ook niet. Dat werkt precies zolang tot
iemand een kolom toevoegt.

Wil je iets anders in het schema, pas dan het schema aan en genereer opnieuw.

## Custom

Komt uit `pnpm db:generate --custom --name=<naam>`. Hier staat alles wat Drizzle niet kan uitdrukken:
extensies, exclusion constraints, partiële unieke indexen, rechten intrekken, triggers. De tweede
migratie van het template (`0001_core_guards`) is er een: de unieke index die één organisatie
afdwingt en de trigger die de audit log append-only maakt.

Deze bestanden schrijf je zelf en die blijven staan.

## Nooit met de hand een migratie erbij zetten

Een kolom toevoegen door zelf een `.sql` te schrijven en zelf een regel in `meta/_journal.json` te
zetten, werkt en is toch fout. Twee dingen gaan er dan mis, en ze zijn beide stil.

**De snapshot loopt achter.** Drizzle vergelijkt het schema met de laatste snapshot in `meta/`, niet
met de SQL. Een handgeschreven migratie zonder snapshot betekent dat de volgende `pnpm db:generate`
die kolommen alsnog wil toevoegen: een tweede migratie voor iets wat er al staat. `pnpm check:drift`
vangt dat af, en dat is precies waarvoor die check bestaat.

**Het tijdstempel bepaalt de volgorde.** `when` in het journal is wat de loper in `created_at` zet,
en hij kiest wat er nog moet met `when > laatste created_at` (zie `scripts/lib/migrate.ts`). Zet je
daar een verzonnen getal in dat vóór de echte klok ligt, dan is er niets aan de hand; ligt het
erachter, dan worden alle migraties die daarna echt gegenereerd worden **overgeslagen zonder
foutmelding** tot de klok voorbij dat getal is. Dat is in een eerder project precies zo misgegaan,
met twee handgeschreven migraties met tijdstempels een dag in de toekomst.

Wil je iets wat drizzle niet kan uitdrukken, gebruik dan `pnpm db:generate --custom --name=<naam>`:
dat schrijft een leeg bestand **plus** de snapshot en de journalregel. De inhoud is dan van jou, de
boekhouding blijft van drizzle.

## Een migratie die is uitgevoerd, wijzig je niet meer

Dit is de duurste les van de hele map. In een eerder project kon geen enkele klant een melding
indienen, omdat een migratie was aangepast nadat hij al op een database was uitgevoerd. **Een
uitgevoerde migratie wordt nooit opnieuw uitgevoerd.** De loper kijkt naar
`drizzle.__drizzle_migrations` en slaat over wat er staat. De verbetering bereikte die database dus
niet, terwijl een latere migratie er wel van uitging: een trigger die verwees naar een kolom die niet
meer bestond.

Wat je in plaats daarvan doet: **een nieuwe migratie schrijven.** Ook als de vorige van vandaag is,
ook als hij alleen op je eigen dev-branch staat. Je weet niet waar hij al gedraaid heeft, en dat is
precies het probleem. `pnpm check:migrations` regel 6 gaat hier op af: een `.sql`-bestand dat al op
`main` bestond en sindsdien is gewijzigd, is een fout.

## Eén transactie per migratie

`pnpm db:migrate` en `pnpm db:deploy` lopen allebei via `scripts/lib/migrate.ts` en voeren **elk
bestand in een eigen transactie** uit. Dat is met opzet anders dan `drizzle-kit migrate`, dat alles
in één transactie doet.

De reden is een val: Postgres staat niet toe dat een enumwaarde wordt gebruikt in dezelfde
transactie waarin hij is toegevoegd. Op een database waar de eerste migratie al stond gaat dat goed;
op een verse branch, waar alles in één keer moet, faalt het met `unsafe use of new value of enum
type`. Elke keten met een nieuwe enumwaarde erin loopt daar tegenaan.

Wat dat betekent voor jou:

- **Een nieuwe enumwaarde en het gebruik ervan horen in twee migraties.** `pnpm check:migrations`
  regel 5 controleert dat.
- **Breekt migratie vier van zeven, dan staan de eerste drie er wel.** Repareer het bestand en draai
  opnieuw; de rest wordt overgeslagen omdat de boekhouding per migratie is bijgewerkt.
- De boekhouding is die van drizzle gebleven, tot en met de hash. `scripts/lib/migrate.test.ts`
  bewaakt dat.

## De terugweg

Elke migratie heeft een tegenhanger in `down/` met **exact dezelfde bestandsnaam**. Dat is een eis uit
de Definition of done in `CLAUDE.md`, niet een suggestie.

```powershell
pnpm db:migrate      # vooruit
pnpm db:down         # laatste migratie terug
pnpm db:roundtrip    # vooruit, terug, vooruit: het bewijs voor in de PR
pnpm db:status       # wat staat er nu
```

Extensies worden in een down-migratie niet gedropt. Latere migraties leunen erop en een extensie kan
door een andere hand zijn aangezet.

## Het model wijzigen

Hoe duur een wijziging is, hangt af van één ding: staat er al data in, en is die data ergens in
bevroren of op een rapport beland.

| Wijziging | Kosten | Aanpak |
|---|---|---|
| Kolom toevoegen, nullable | Verwaarloosbaar | Schema aanpassen, `db:generate`, klaar |
| Kolom toevoegen, verplicht | Klein | Nullable toevoegen, vullen, dan `not null` maken. Drie migraties, geen downtime |
| Constraint toevoegen | Klein tot middel | Eerst controleren of de bestaande data hem haalt, anders faalt de migratie halverwege |
| Kolom hernoemen | **Val** | Zie hieronder |
| Tabel splitsen of de korrel veranderen | Groot | Alleen met een datamigratie en een plan per stap |

### De val bij hernoemen

Drizzle vergelijkt het schema met de snapshot en ziet een hernoemde kolom als een `drop` plus een
`add`. Dat is dataverlies, en het staat in een gegenereerd bestand dat er verder normaal uitziet.
`drizzle-kit` vraagt het interactief na, maar in een script of in CI is er niemand om te antwoorden.

**Lees elke gegenereerde migratie voordat je hem uitvoert.** Staat er een `DROP COLUMN` in terwijl je
een naam wijzigde, dan is dat de val. Los hem op met uitbreiden en inkrimpen:

1. Nieuwe kolom toevoegen, nullable.
2. Data kopiëren in een eigen migratie.
3. Code omzetten naar de nieuwe kolom, uitrollen.
4. Oude kolom droppen, in weer een eigen migratie.

Vier stappen die elk apart terug te draaien zijn, in plaats van één die dat niet is.

## Voordat je een migratie in een PR zet

```powershell
pnpm db:roundtrip
```

Op je dev-branch, nooit op productie. Dat is wat "een down die is uitgevoerd" betekent: gedraaid, niet
geschreven.
