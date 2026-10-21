<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Gereserveerde modules

Namen die in het manifest staan met `status: reserved`: een configuratie mag ze nog niet noemen, en
ze komen in een latere versie van het template. Ze staan hier zodat niemand er ondertussen iets
anders onder bouwt.

| Module | Wat het wordt | Wat er nu al voor klaarstaat |
|---|---|---|
| `monitoring-sentry` | Fouten en prestaties naar Sentry, met het scrubben van persoonsgegevens voordat iets de deur uit gaat | `lib/monitoring/report.ts` logt gescrubd naar de console; het patroon `docs/patronen/sentry-envelope.md` beschrijft de envelop |
| `portal` | Een omgeving voor buitenstaanders (klanten, leden) met eigen inlog en rij-niveau-autorisatie | De module files kent al doelen met een eigen container en token; de rechten `files:read` en `files:write` zijn er |
| `access-graph` | Rollen toekennen in Entra vanuit de tool, via Microsoft Graph | Het patroon `docs/patronen/rollen-schrijven-naar-entra.md`; nu is Toegang bij Entra alleen-lezen |

Wil een project iets uit deze lijst eerder, dan is dat een besluit met een prijs: het project bouwt
het zelf, en bij een latere update van het template komen de twee naast elkaar te staan.
