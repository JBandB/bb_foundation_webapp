<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Eén organisatie

**Wanneer.** Altijd. Het template is multi-tenant-ready en niet multi-tenant.

**Het patroon.** `organisation_id` staat op elke tabel met domeinbetekenis en de data-access laag
geeft hem verplicht mee, uit de actor en nooit uit de request. Tegelijk staat er een unieke index
die precies één rij in `organisations` toestaat, zodat niemand per ongeluk een tweede tenant
aanmaakt zonder er over nagedacht te hebben. Komt er ooit een tweede, dan is dat één migratie (de
index weg) en nul queries, want elke query filtert al.

```ts
export const members = pgTable("members", {
  id: primaryKeyColumn(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  ...timestamps,
}, (t) => [index("members_organisation_idx").on(t.organisationId)]);

export async function listMembers(db: DbOrTransaction, actor: Actor): Promise<Member[]> {
  assertCan(actor, "members:read");
  return db.select().from(members).where(and(eq(members.organisationId, actor.organisationId), isNull(members.deletedAt)));
}
```

```sql
-- migratie 0001_core_guards
create unique index one_organisation on organisations ((true));
```

**Wat het kost.** Een kolom en een voorwaarde per query, die je toch al wilt. De huisregel
`subquery-columns` let op een subquery zonder organisatie.

**Waar in het template.** `lib/db/schema/organisations.ts`, de index in `0001_core_guards`,
`pnpm check:core` sectie 2 (een tweede organisatie wordt geweigerd), en `requireCron` dat de ene
organisatie aan een cron geeft.
