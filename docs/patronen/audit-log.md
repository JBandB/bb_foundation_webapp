<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# De audit log

**Wanneer.** Bij elke mutatie van iets dat een mens later wil kunnen nalopen: wie deed wat, wanneer,
en wat stond er eerst.

**Het patroon.** Eén tabel `audit_log` met de organisatie, de actor (gebruiker of het systeem), de
tabel en de rij, de actie (`insert`, `update`, `delete`, `restore`, plus de eigen acties van het
project in `lib/db/audit-actions.ts`), `before` en `after` als jsonb, en de herkomst van het verzoek.
Append-only, afgedwongen door een trigger die `UPDATE` en `DELETE` weigert, want de app verbindt als
eigenaar en een `REVOKE` zou haar niet tegenhouden. De regel wordt geschreven in dezelfde transactie
als de mutatie: lukt een van beide niet, dan gebeurt er niets.

```ts
await db.transaction(async (tx) => {
  const before = (await tx.select().from(settings).where(eq(settings.id, id)))[0];
  const [after] = await tx.update(settings).set(values).where(eq(settings.id, id)).returning();
  await appendAuditLog(tx, actor, { entityTable: "settings", entityId: id, action: "update", before, after });
});

// Zonder mens: een cron of een script.
await appendAuditLog(db, systemActor(organisationId), { entityTable: "jobs", entityId: job.id, action: "update", after: { status: "pending" } });
```

**Wat het kost.** Eén insert per mutatie en een tabel die groeit. Geen opruimtaak: de audit log is
juist wat blijft. Schrijf nooit een wachtwoord, een token of een volledig document in `before` of
`after`; de velden die ertoe doen zijn genoeg.

**Waar in het template.** `lib/db/audit.ts` (`appendAuditLog`, `systemActor`), de trigger in de
migratie `0001_core_guards`, en `pnpm check:core` bewijst dat een update en een delete worden
geweigerd.
