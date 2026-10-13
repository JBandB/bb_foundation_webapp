<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Patronen

Herbruikbare ontwerppatronen uit eerdere projecten met deze stack. Elk bestand zegt wanneer je het
gebruikt, hoe het werkt, wat het kost en waar het in het template staat, met een klein codevoorbeeld
zonder domeinnamen. Lees het patroon dat bij je taak hoort; de triggertabel staat in `CLAUDE.md`.

| Patroon | Eén zin |
|---|---|
| [geld-in-centen](geld-in-centen.md) | Geld is een geheel aantal centen met een valuta, nooit een float |
| [duur-in-minuten](duur-in-minuten.md) | Een duur is een geheel aantal minuten; decimale uren bestaan alleen bij tonen |
| [zacht-verwijderen](zacht-verwijderen.md) | `deleted_at` in plaats van `DELETE`, en elke query filtert erop |
| [audit-log](audit-log.md) | Elke mutatie schrijft in dezelfde transactie een regel die nooit meer verandert |
| [idempotentie-en-lease](idempotentie-en-lease.md) | Werk naar buiten als rij met een unieke sleutel, opgeëist met `for update skip locked` |
| [outbox-en-berichtencatalogus](outbox-en-berichtencatalogus.md) | Mail is een rij in de outbox en een soort in de catalogus; de beheerder bepaalt naar wie |
| [geldigheid-met-exclusion-constraint](geldigheid-met-exclusion-constraint.md) | Tarieven, roosters en andere "geldig van tot" zonder overlap, afgedwongen door Postgres |
| [een-organisatie](een-organisatie.md) | `organisation_id` op elke tabel, en een unieke index die er precies één toestaat |
| [rollen-uit-de-inlogmodule](rollen-uit-de-inlogmodule.md) | Rollen uit het token of uit de database, nooit uit een cookie of de request |
| [versie-zichtbaar](versie-zichtbaar.md) | Eén versie in `lib/version.ts`, zichtbaar in de rail, per pull request omhoog |
| [besluitenlog](besluitenlog.md) | Elk besluit met nummer, datum en prijs in SPEC; omkeren is een nieuw besluit |
| [koppeling-die-netjes-uitstaat](koppeling-die-netjes-uitstaat.md) | Een koppeling zonder variabelen doet niets, zegt wat ontbreekt, en blokkeert niets |
| [checkscript](checkscript.md) | Gedrag bewijzen tegen de dev-branch in een transactie die wordt teruggedraaid |
| [cronroute](cronroute.md) | Een cron is een route achter `CRON_SECRET`, en dezelfde code als `pnpm task:<naam>` |
| [jobhandler-schrijven](jobhandler-schrijven.md) | Een handler per `<systeem>:<operatie>`, idempotent, met `done` of `waiting` |
| [extra-bestandsdoel](extra-bestandsdoel.md) | Een nieuw doel in `lib/files/purposes.ts`, met zijn eigen grens, types en eventueel container |
| [project-tabblad-onder-beheer](project-tabblad-onder-beheer.md) | Een eigen tabblad onder Beheer via `tabs.project.ts`, achter een eigen recht |
| [tweede-ui-taal](tweede-ui-taal.md) | Eén sleutelbron, een tweede taal met `satisfies`, en een test die vergeten vertalingen vindt |
| [sentry-envelope](sentry-envelope.md) | Fouten melden met gescrubde inhoud; klaar voor de gereserveerde module |
| [rollen-schrijven-naar-entra](rollen-schrijven-naar-entra.md) | Rollen toekennen via Graph, als wachtrijtaak; klaar voor de gereserveerde module |
