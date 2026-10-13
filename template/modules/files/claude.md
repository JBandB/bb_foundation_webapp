## Module files: bestanden

- **Elk bestand gaat via `uploadFile`** in `lib/files/store.ts`, met een doel uit `lib/files/purposes.ts`
  (van het project: de grens en de toegestane types) en de entiteit waar het bij hoort. De inhoud
  wordt nagekeken voordat hij de opslag in gaat; wat niet is wat het zegt, komt er niet in.
- **Downloaden alleen via `/api/files/<id>`**: de server controleert het recht en geeft de inhoud door.
  Het SAS-token staat in een variabele en bereikt de browser nooit; geen rechtstreekse blob-URL's in
  een pagina.
- **Twee sloten op elke handeling**: `files:read` of `files:write` uit de matrix, en de rij-niveau-
  controle van het project in `lib/files/authorize.project.ts` (standaard: alles mag zodra het recht
  er is). Wat iemand niet mag zien, is een 404.
- **Verwijderen is zacht** (`deleted_at`); de blob blijft staan tot een mens of een opruimtaak hem
  weghaalt, want een bestand kan onder een bewaarplicht vallen.
- **Vier megabyte is de grens** van een server action op Vercel. Groter hoort rechtstreeks naar de
  opslag met een kortlevend token, en dat is een eigen ontwerp van het project dat het nodig heeft.
- **Bewijs:** `pnpm check:files` (administratie en sloten), `pnpm blob:status` (een pixel erin en eruit,
  met het echte token), e2e `08-files.spec.ts` (de route is dicht zonder sessie).
