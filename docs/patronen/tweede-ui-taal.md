<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Een tweede UI-taal

**Wanneer.** Het template levert Nederlands en Engels; het project kiest er één in
`project.config.json`. Dit patroon is voor wie een derde taal wil, of voor de eigen teksten van het
project in beide talen wil houden.

**Het patroon.** Eén taal is de **sleutelbron** (`nl`); elke andere taal is een object met precies
dezelfde sleutels, afgedwongen met `satisfies Widen<typeof nl>`: strings worden `string`, functies
houden hun signatuur, en een sleutel die in de bron bijkomt en in de vertaling niet, compileert
niet. Een test loopt alle bladeren langs en vindt vergeten vertalingen (dezelfde tekst in beide
talen), met een korte lijst uitzonderingen waar dezelfde woorden terecht gelijk zijn. De keuze van
de taal gebeurt één keer, in `lib/i18n/template/index.ts` op `PROJECT.uiLanguage`; de rest van de
code kent alleen `labels`. Geen `t("pad.naar.tekst")`: dat is niet te typeren en zet bij een tikfout
de sleutel op het scherm.

```ts
// lib/i18n/domain/shifts.ts
const nl = { title: "Diensten", unfilled: (count: number) => `${count} nog niet bezet` };
const en = { title: "Shifts", unfilled: (count: number) => `${count} still open` } satisfies Widen<typeof nl>;
export const shiftLabels = { nl, en }[PROJECT.uiLanguage];

// lib/i18n/labels.ts (van het project)
export const labels = { ...templateLabels, shifts: shiftLabels, ... } as const;
```

**Wat het kost.** Elke tekst twee keer, en een test die je eraan houdt. Een derde taal betekent
`uiLanguage` uitbreiden in het schema van de configuratie, `deriveLocale` en de teksten van het
template zelf; dat is een wijziging aan het template en niet aan een project.

**Waar in het template.** `lib/i18n/template/nl.ts`, `en.ts` (met `Widen`), `en.test.ts`, de
labelbestanden van de modules met hun eigen test, en de huisregel `labels-size` die een labelbestand
boven de zeshonderd regels weigert.
