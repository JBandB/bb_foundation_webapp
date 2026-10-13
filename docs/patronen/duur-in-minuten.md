<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Duur in minuten

**Wanneer.** Het project registreert tijd: diensten, uren, afspraken, doorlooptijden.

**Het patroon.** Een duur is `minutes integer`, een geheel aantal, met een check op het veelvoud
dat het project kiest (kwartieren: `minutes % 15 = 0`). Een begintijd is `start_minute integer`
(minuten na middernacht); het einde wordt afgeleid en nooit opgeslagen, zodat het de duur niet kan
tegenspreken. Decimale uren bestaan alleen bij tonen en in een export. Een datum is een aparte
`date`-kolom, afgeleid in de tijdzone van het project, niet uit een `timestamptz` op de server.

```ts
export const shifts = pgTable(
  "shifts",
  {
    id: primaryKeyColumn(),
    organisationId: uuid("organisation_id").notNull().references(() => organisations.id),
    workDate: date("work_date").notNull(),
    startMinute: integer("start_minute").notNull(),
    minutes: integer("minutes").notNull(),
  },
  (t) => [
    check("shifts_quarters", sql`${t.minutes} > 0 and ${t.minutes} % 15 = 0 and ${t.startMinute} % 15 = 0`),
    check("shifts_within_day", sql`${t.startMinute} >= 0 and ${t.startMinute} + ${t.minutes} <= 1440`),
  ],
);

export function formatHours(minutes: number): string {
  return new Intl.NumberFormat(PROJECT.locale, { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(minutes / 60);
}
```

**Wat het kost.** Invoer in uren en minuten moet naar minuten vertaald worden, met een melding als
het geen kwartier is. Sommen over een week blijven gehele getallen; de omrekening naar uren komt pas
in het scherm.

**Waar in het template.** `lib/domain/dates.ts` voor de datum in de tijdzone van het project
(`dateIn`); de rest schrijft het project, met een test op `0`, negatief en geen veelvoud.
