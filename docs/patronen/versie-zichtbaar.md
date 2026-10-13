<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# De versie zichtbaar

**Wanneer.** Altijd. Vanaf de eerste pull request.

**Het patroon.** Eén constante `APP_VERSION` in `lib/version.ts` en nergens anders, zichtbaar
linksonder in de rail en op het inlogscherm, met `APP_HIGHLIGHTS` (hooguit drie regels, geen namen
of bedragen, want het inlogscherm is technisch publiek). Elke pull request levert een versie op en
heet ernaar; de tweede positie loopt per pull request op, de eerste alleen op het woord van de
eigenaar. Over de tool toont `RELEASE-NOTES-KORT.md`, waarvan de kop exact `## vX.YY` is en de e2e
controleert dat die gelijk is aan `APP_VERSION`.

```ts
// lib/version.ts
export const APP_VERSION = "v0.07";
export const APP_HIGHLIGHTS = ["Diensten aanmaken met datum, tijd en aantal mensen.", "Beheer toont wie er in de tool kan."] as const;
```

```markdown
## v0.07
3 oktober 2026

- Je kunt nu een dienst aanmaken en bewerken.
```

**Wat het kost.** Twee regels per pull request en de discipline om ze niet te vergeten. De e2e `02`
faalt als de kop in de korte release notes niet bij de versie past.

**Waarom.** Een reparatie kan gemaakt zijn, gemerged zijn en toch nog niet in de browser staan die je
open hebt. Zonder versie in beeld is "werkt het al?" niet te beantwoorden, en dat kostte in een
eerder project een ronde zoeken naar een fout die al gerepareerd was.

**Waar in het template.** `lib/version.ts` (seed), `components/nav-rail.tsx`, `app/sign-in/page.tsx`,
`app/(app)/about/`, `e2e/02-about.spec.ts`.
