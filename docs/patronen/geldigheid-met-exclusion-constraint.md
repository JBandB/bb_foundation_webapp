<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Geldigheid met een exclusion constraint

**Wanneer.** Iets geldt "van tot": een tarief, een werkrooster, een lidmaatschap, een prijsafspraak.
Twee geldige rijen mogen elkaar niet overlappen, en een nieuwe sluit de oude af.

**Het patroon.** Twee datumkolommen `valid_from date` en `valid_to date null` (open einde), en een
**exclusion constraint** met `btree_gist` die overlap voor dezelfde sleutel weigert in de database
zelf, niet in de code. Wijzigen is nooit een update van een bestaande rij: de oude wordt afgesloten op
de dag vóór de nieuwe ingangsdatum, de nieuwe begint erop. Zo verandert een correctie de historie
niet. De constraint kan Drizzle niet uitdrukken; hij staat in een custom migratie.

```sql
-- in een migratie uit pnpm db:generate --custom --name=rate_cards_no_overlap
create extension if not exists btree_gist;
alter table rate_cards add constraint rate_cards_no_overlap
  exclude using gist (
    organisation_id with =,
    role_id with =,
    daterange(valid_from, valid_to, '[)') with &&
  );
```

```ts
// Indexeren: nieuwe kaarten, nooit herrekenen.
await db.update(rateCards).set({ validTo: dayBefore(from) }).where(and(eq(rateCards.roleId, roleId), isNull(rateCards.validTo)));
await db.insert(rateCards).values({ organisationId, roleId, amountCents: next, currency: "EUR", validFrom: from, validTo: null });
```

**Wat het kost.** `btree_gist` moet bestaan (Neon heeft het; een lokale Postgres zonder extensie laat
de constraint stil weg, en dat is één reden waarom lokaal tegen een Neon dev-branch wordt gewerkt).
En een query naar "het tarief op datum X" is altijd `valid_from <= X and (valid_to is null or
valid_to > X)`, liefst in één helper.

**Waar in het template.** Niet als code; `lib/db/errors.ts` kent `isExclusionViolation` en
`pnpm check:<domein>` is de plek om te bewijzen dat overlap wordt geweigerd. Zie
`docs/patronen/checkscript.md`.
