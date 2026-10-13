# Webapp

Een nieuw project uit het template BB_foundation_webapp. Versie: zie `lib/version.ts`, linksonder
in de rail en op het inlogscherm.

## Documentatie

| Bestand | Wat |
|---|---|
| `CLAUDE.md` | De regels die altijd gelden, voor Claude en voor wie meeleest |
| `docs/PROJECTPLAN.md` | Het plan dat de inhoud dicteert |
| `docs/SPEC.md` | De specificatie met het besluitenlog |
| `docs/ROADMAP.md` | De eerlijke stand per onderdeel |
| `docs/WERKWIJZE.md` | Hoe je met Claude aan dit project werkt |
| `docs/handleiding/01-start-hier.md` | De accounts, de toegang en de variabelen, klik voor klik |
| `docs/THEME.md` | Kleuren, letters en de onderdelen van de interface |
| `RELEASE-NOTES.md`, `RELEASE-NOTES-KORT.md` | Wat er per versie veranderde, voor bouwers en voor gebruikers |

## Aan de slag

```powershell
pnpm install              # de afhankelijkheden
pnpm setup:hooks          # de commit-hook die em-dashes weigert
vercel env pull .env.local   # de variabelen van de omgeving Development, zie handleiding 07
pnpm dev                  # de ontwikkelserver
```

## Kwaliteitspoort

```powershell
pnpm typecheck            # TypeScript
pnpm lint                 # ESLint plus de huisregels
pnpm test                 # de unittests
pnpm check:contrast       # de kleuren halen de norm in beide modi
pnpm build                # de productiebuild
```

De hele batterij, inclusief de controles tegen de database en de e2e, is `pnpm check:all` (komt
met een latere ronde van het template).

## Gemaakt uit

BB_foundation_webapp, zie `template.lock.json` voor de versie en `template/README.md` voor hoe het
werkt.
