<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Zacht verwijderen

**Wanneer.** Standaard voor elke domeintabel. Hard verwijderen alleen voor wat nooit gebeurd is
(een concept, een geplande regel) en dan met een besluit in SPEC dat zegt waarom.

**Het patroon.** De kolom `deleted_at timestamptz` uit `softDelete` in `lib/db/schema/columns.ts`.
Verwijderen is een update die hem zet, in een server action met het recht erbij en een auditregel.
Elke leesquery filtert op `is null`, liefst via één helper per tabel zodat een vergeten filter niet
kan. Een unieke sleutel die na verwijderen opnieuw gebruikt mag worden, is een partiële index
(`where deleted_at is null`).

```ts
export const members = pgTable("members", {
  id: primaryKeyColumn(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  email: text("email").notNull(),
  ...timestamps,
  ...softDelete,
}, (t) => [uniqueIndex("members_email_live").on(t.organisationId, sql`lower(${t.email})`).where(sql`${t.deletedAt} is null`)]);

export async function removeMember(db: DbOrTransaction, actor: Actor, id: string): Promise<void> {
  assertCan(actor, "members:write");
  const before = (await db.select().from(members).where(and(eq(members.id, id), eq(members.organisationId, actor.organisationId), isNull(members.deletedAt))))[0];
  if (before === undefined) return;
  await db.update(members).set({ deletedAt: sql`now()`, updatedAt: sql`now()` }).where(eq(members.id, id));
  await appendAuditLog(db, actor, { entityTable: "members", entityId: id, action: "delete", before });
}
```

**Wat het kost.** Elke query één voorwaarde meer, en een opruimtaak als rijen na een bewaartermijn
echt weg mogen. Daar staat tegenover dat "per ongeluk weg" niet bestaat en een factuur of een
bewaarplicht nooit een gat heeft.

**Waar in het template.** `softDelete` in `lib/db/schema/columns.ts`; `users` en `files` gebruiken
het; `removeFile` in `lib/files/store.ts` is het voorbeeld met auditregel.
