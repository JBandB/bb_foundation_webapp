<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Een checkscript

**Wanneer.** Gedrag dat alleen de database kan bewijzen: een constraint, een trigger, een unieke
sleutel, een lease, een recht dat in de query zit. Een unittest kan dat niet, een e2e is er te traag
en te grof voor.

**Het patroon.** `scripts/check-<domein>.ts` draait tegen de dev-branch met `withDirectDb`, haalt de
vaste context op (`requireContext`: de organisatie en een dev-account), en doet elke bewering in
`inRollback`: een transactie die aan het eind wordt teruggedraaid, zodat de database na afloop is
zoals ervoor. Een verwachte weigering gaat door `expectDbError` met de SQLSTATE en de naam van de
constraint. De uitkomst is een telling en een exitcode, en het script heet `pnpm check:<domein>`.

```ts
runScript(async () => {
  await withDirectDb(async (pool) => {
    const db = scriptDb(pool);
    const ctx = await requireContext(db);
    const t = createChecker();

    t.section("1. Twee diensten op hetzelfde moment voor dezelfde persoon kunnen niet");
    await inRollback(db, async (tx) => {
      await tx.insert(shifts).values({ organisationId: ctx.organisationId, personId: ctx.userId, workDate: "2026-10-03", startMinute: 540, minutes: 240 });
      const second = await expectDbError(tx, (sp) => sp.insert(shifts).values({ organisationId: ctx.organisationId, personId: ctx.userId, workDate: "2026-10-03", startMinute: 600, minutes: 60 }), {
        code: EXCLUSION_VIOLATION,
        constraint: "shifts_no_overlap",
      });
      t.ok("de tweede wordt geweigerd", second.matches, second.detail);
    });

    t.summary("check:shifts");
  });
});
```

**Wat het kost.** Een dev-branch in `.env.local` en een paar minuten per domein. De uitslag hoort in
de rubriek Bewijs van de release notes; `pnpm check:all` draait ze allemaal.

**Waar in het template.** `scripts/lib/check.ts` (het gereedschap), `scripts/check-core.ts` (de
sloten van de kern), `scripts/check-example.ts` (een kopieerbaar voorbeeld, van het project), en de
checks van de modules.
