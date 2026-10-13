<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Teksten per domein

Elke map met schermen krijgt hier één bestand met zijn teksten, bijvoorbeeld `orders.ts`:

```ts
export const ordersLabels = {
  orders: {
    title: "Bestellingen",
    empty: "Er zijn nog geen bestellingen.",
    count: (n: number) => `${n} bestellingen`,
  },
} as const;
```

En in `lib/i18n/labels.ts` één regel erbij:

```ts
export const labels = {
  ...templateLabels,
  ...ordersLabels,
} as const;
```

Waarom zo: in een eerder project groeide het ene labelbestand naar ruim vierduizend regels, en
niemand kon nog zien welke teksten bij welk scherm hoorden. De huisregel `labels-size` weigert
daarom elk labelbestand boven de zeshonderd regels.

Twee afspraken:

- **Teksten met een invulwaarde zijn functies**, zoals `count` hierboven. Een functie passeert de
  grens naar een clientcomponent niet; geef dan de uitkomst door als string.
- **Vertalingen van enumwaarden** zet je vast met `satisfies Record<MijnEnum, string>`, met het type
  via `import type` uit `@/lib/db/schema`, zodat een vergeten vertaling een compilerfout is en er
  geen schemacode in de clientbundel belandt.
