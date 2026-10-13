<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Een extra bestandsdoel

**Wanneer.** Het project heeft de module files en wil een nieuwe soort bestand bewaren: foto's bij een
melding, bijlagen van een buitenstaander, een maandelijkse aanlevering.

**Het patroon.** Een doel is een sleutel in `lib/files/purposes.ts` met zijn eigen grens en lijst van
types. Het wordt een map in de container en een woord in `files.purpose`. Krijgt het doel bestanden
van een andere groep mensen (buitenstaanders), dan krijgt het een eigen container en een eigen token
(`containerVar`, `tokenVar`): een token dat hun bestanden kan lezen, kan dan de rest niet openen. De
rij-niveau-controle voor het doel komt in `lib/files/authorize.project.ts`.

```ts
// lib/files/purposes.ts
export const FILE_PURPOSES: Readonly<Record<string, PurposeSpec>> = {
  documents: { maxBytes: 4 * 1024 * 1024, types: new Map([["application/pdf", "pdf"], ["image/png", "png"], ["image/jpeg", "jpg"]]) },
  reports: {
    maxBytes: 4 * 1024 * 1024,
    types: new Map([["text/csv", "csv"], ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"]]),
    containerVar: "AZURE_REPORTS_CONTAINER",
    tokenVar: "AZURE_REPORTS_SAS_TOKEN",
  },
};

// lib/files/authorize.project.ts
export async function canReadFile(actor: Actor, file: FileSummary): Promise<boolean> {
  if (file.purpose === "reports") return can(actor, "reports:read");
  return true;
}
```

**Wat het kost.** Twee variabelen extra als het doel een eigen container heeft (en een regel in
`.env.example` buiten het beheerde blok), een regel in de handleiding van het project, en
`pnpm blob:status` draait de proef per doel. Boven de vier megabyte hoort een andere weg
(rechtstreeks naar de opslag met een kortlevend token) en dat is een eigen ontwerp.

**Waar in het template.** `lib/files/blob.ts` (`PurposeSpec`, de controle van de inhoud),
`lib/files/store.ts`, de seeds `purposes.ts` en `authorize.project.ts`, `scripts/blob-status.ts`.
