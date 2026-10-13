<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# De wizard

Eén HTML-bestand dat de vragen stelt die een nieuw project uit dit template nodig heeft, en van de
antwoorden de bestanden maakt waarmee Claude Code kan beginnen. Acht stappen, samen ongeveer een
uur; de meeste tijd zit in de inhoud van het projectplan. Je kunt stoppen en later verdergaan.

## Openen

Open `wizard/index.html` in een browser: lokaal met een dubbelklik, of vanaf GitHub met Download raw
file en dan de download. Er is geen server, geen installatie en geen internetverbinding nodig.

## Wat hij maakt, en waar het heen gaat

| Bestand | Waar het heen gaat |
|---|---|
| `project.config.json` | de root van de repo, over de bestaande |
| `PROJECTPLAN.md` | `docs/PROJECTPLAN.md` |
| `00-checklist-<slug>.md` | `docs/handleiding/` |
| `logo.svg`, alleen bij een eigen logo | `public/brand/logo.svg` |
| de startprompt, te kopiëren of als `startprompt.md` | in Claude Code plakken, niet in de repo |

Commit de bestanden voordat je `pnpm template:apply` draait: apply weigert op een werkmap met
wijzigingen die nog niet gecommit zijn. Daarna plak je de startprompt in Claude Code, en werk je de
checklist af naast het bouwen.

## Privacy

Niets verlaat de browser. De antwoorden staan alleen in de opslag van die browser (`localStorage`,
sleutel `foundation-wizard:v1`), zodat je kunt stoppen en verdergaan. De knop Opnieuw beginnen op
het eerste scherm wist ze. Zet geen wachtwoorden of andere geheimen in de wizard.

## Het schema

De uitvoer moet voldoen aan `template/schema/project.config.schema.json`. De wizard controleert de
belangrijkste regels zelf; `pnpm template:validate` controleert het hele bestand, ook de regels over
meer dan één veld, zoals modules die elkaar nodig hebben. Verandert het schema of het manifest, dan
verandert de wizard mee in dezelfde versie van het template.
