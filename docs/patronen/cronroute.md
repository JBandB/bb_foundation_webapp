<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Een cronroute

**Wanneer.** Werk dat op een vast moment moet gebeuren zonder dat iemand ergens op drukt: opruimen,
herinneren, een wachtrij verwerken, een stand bijwerken.

**Het patroon.** Een route handler `app/api/cron/<naam>/route.ts` die begint met `requireCron`: dicht
zonder `CRON_SECRET` (404, zodat de route niet eens lijkt te bestaan), 500 als het geheim niet is
ingesteld, en met de ene organisatie als context. `maxDuration` expliciet op 60, want een cron die
over zijn tijd gaat wordt stil afgekapt. De echte logica staat in `lib/tasks/<naam>.ts` en wordt ook
aangeroepen door `scripts/task-<naam>.ts` (`pnpm task:<naam>`), zodat je hem vanaf je eigen machine
kunt draaien zonder het geheim. Het rooster staat in `vercel.json` via het manifest; op Vercel Hobby
hoogstens één keer per dag, dus werk dat sneller moet gebeurt direct na de handeling (zie de
modules jobs en messaging) en de cron is het vangnet.

```ts
// app/api/cron/reminders/route.ts
export const maxDuration = 60;

export async function GET(request: Request): Promise<Response> {
  const context = await requireCron(request);
  if (!context.ok) return context.response;
  const report = await sendReminders(getDb(), context.organisationId, new Date());
  return Response.json(report);
}

// scripts/task-reminders.ts
runScript(async () => {
  const db = getDb();
  const organisation = (await db.select({ id: organisations.id }).from(organisations).limit(1))[0];
  if (organisation === undefined) throw new Error("Geen organisatie; draai pnpm db:bootstrap.");
  console.log(await sendReminders(db, organisation.id, new Date()));
  await closeDb();
});
```

**Wat het kost.** Een regel in `vercel.json` (bij het project zelf: rechtstreeks; bij een module:
via het manifest), een script, en de e2e die bewijst dat de route zonder geheim dicht is.

**Waar in het template.** `lib/cron/guard.ts` met test, `app/api/cron/prune/route.ts`,
`scripts/task-prune.ts`, `e2e/04-cron.spec.ts`, en `pnpm smoke:prod` controleert elke cronroute uit
`vercel.json` op de 404.
