<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Module files

Bestanden in Azure Blob Storage, met hier alleen de administratie en een downloadroute die het recht
controleert.

## Hoe het werkt

- **Doelen** (`lib/files/purposes.ts`, van het project): per doel de grens en de toegestane types.
  Standaard één doel `documents` met pdf, docx, png en jpg tot vier megabyte.
- **`uploadFile`** controleert de grens, het type en de eerste bytes van de inhoud (en weigert
  Office-bestanden met macro's, en de oude formaten .xls en .doc altijd), schrijft naar de container
  met een PUT die nooit overschrijft (`If-None-Match: *`, een willekeurig stuk in het pad) en
  registreert de rij in `files`. De bewaarde naam krijgt de extensie van het gecontroleerde type. Eén
  persoon brengt hoogstens 100 bestanden per uur. Het SAS-token staat in een variabele op de server
  en bereikt de browser nooit.
- **Downloaden** via `/api/files/<id>`: 401 zonder sessie, 404 voor wat niet bestaat of niet mag,
  als bijlage met `nosniff` en zonder cache.
- **Twee sloten**: `files:read` en `files:write` uit de matrix, en de rij-niveau-controle van het
  project in `lib/files/authorize.project.ts`.
- **Zacht verwijderen**: de rij krijgt `deleted_at`, de blob blijft staan (bewaarplicht).
- **Beheer, Systeem** toont of de opslag is ingericht en hoe lang het token nog geldig is
  (`BLOB_SAS_EXPIRES`).

## Variabelen

`AZURE_STORAGE_ACCOUNT`, `AZURE_STORAGE_CONTAINER`, `AZURE_STORAGE_SAS_TOKEN` (Read, Create, Write;
geen Delete en geen List; met vervaldatum), `BLOB_SAS_EXPIRES`. Zie handleiding 22.

## Bewijs

`pnpm check:files`, `pnpm blob:status` (een pixel erin en eruit met het echte token), e2e
`08-files.spec.ts`.
