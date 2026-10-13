<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# De Sentry-envelop

**Wanneer.** Nog niet: dit is het patroon voor de gereserveerde module `monitoring-sentry`. Tot die
er is, logt `lib/monitoring/report.ts` gescrubd naar de console van Vercel.

**Het patroon.** Een fout verlaat de tool nooit met persoonsgegevens erin. Eén functie `reportError`
die de boodschap scrubt (e-mailadressen, tokens, verbindingsstrings, uuid's die naar een persoon
kunnen wijzen) en daarna pas doorgeeft. Met Sentry wordt die doorgave een envelop naar de ingest-URL
uit `SENTRY_DSN`, zonder SDK als het kan: een POST met het event als JSON, een `event_id`, de
`release` gelijk aan `APP_VERSION`, en `environment` uit `VERCEL_ENV`. Zonder DSN staat de koppeling
netjes uit (zie dat patroon). Nooit `user.email` meesturen; `user.id` alleen als dat een uuid is
die buiten de tool niets betekent.

```ts
export async function reportError(error: unknown, context: { route?: string } = {}): Promise<void> {
  const message = scrubMessage(error instanceof Error ? error.message : String(error));
  console.error(`[report] ${context.route ?? "?"}: ${message}`);
  const dsn = process.env.SENTRY_DSN ?? "";
  if (dsn === "") return;
  const { origin, pathname, username } = new URL(dsn);
  const projectId = pathname.replace("/", "");
  const event = { event_id: crypto.randomUUID().replace(/-/g, ""), timestamp: Date.now() / 1000, platform: "node", release: APP_VERSION, environment: process.env.VERCEL_ENV ?? "local", message, tags: { route: context.route ?? "" } };
  const body = `${JSON.stringify({ event_id: event.event_id, sent_at: new Date().toISOString() })}\n${JSON.stringify({ type: "event" })}\n${JSON.stringify(event)}`;
  await fetchWithTimeout(`${origin}/api/${projectId}/envelope/`, { method: "POST", headers: { "content-type": "application/x-sentry-envelope", "x-sentry-auth": `Sentry sentry_version=7, sentry_key=${username}` }, body }).catch(() => undefined);
}
```

**Wat het kost.** Een gratis plan van Sentry met een limiet op events; de envelop is zo'n twintig
regels en geen afhankelijkheid. De module zal daarbovenop `instrumentation.ts` koppelen aan
`onRequestError` van Next.js en een `HealthProvider` leveren.

**Waar in het template.** `lib/monitoring/report.ts` met `scrubMessage` en zijn test.
