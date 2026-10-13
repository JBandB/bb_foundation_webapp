<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Geld in centen

**Wanneer.** Zodra het project een bedrag kent: een prijs, een tarief, een factuurregel, een budget.

**Het patroon.** Een bedrag is `amount_cents bigint` plus `currency char(3)`. Rekenen gebeurt met
`BigInt` of een decimaal-bibliotheek, nooit met `number` en nooit met `parseFloat`. Afronden gebeurt
één keer, op het niveau waar het ertoe doet (de factuurregel, niet de losse regel eronder), en
een regel bevat precies één valuta en één tarief. Tonen gaat via `Intl.NumberFormat` met de locale
uit `PROJECT.locale`.

```ts
// lib/db/schema/prices.ts
export const prices = pgTable("prices", {
  id: primaryKeyColumn(),
  organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
  amountCents: bigint("amount_cents", { mode: "bigint" }).notNull(),
  currency: char("currency", { length: 3 }).notNull().default("EUR"),
});

// lib/domain/money.ts, puur en getest
export function sumCents(parts: readonly bigint[]): bigint {
  return parts.reduce((total, part) => total + part, 0n);
}
export function formatCents(cents: bigint, currency: string): string {
  return new Intl.NumberFormat(PROJECT.locale, { style: "currency", currency }).format(Number(cents) / 100);
}
```

**Wat het kost.** Elke plek die een bedrag toont of invoert, converteert expliciet. Een invoerveld
met komma's wordt geparsed naar centen in de server action, met een test op `0`, negatief, en een
vreemde valuta.

**Waar in het template.** Nergens als code: de kern kent geen geld. De regel staat in `CLAUDE.md`
(regel 15 van het template) en de huisregel die een `parseFloat` op een bedrag weigert, schrijft het
project in `scripts/house-rules/project-rules.mjs` zodra het bedragen heeft.
