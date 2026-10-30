<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Lessen

Wat eerdere projecten met deze stack hebben gekost aan zoeken, en wat het template daarvan heeft
geleerd. Eén bestand per laag. Elke les heeft een vast anker (`L-DRZ-01`) zodat code, commentaar en
besluiten ernaar kunnen verwijzen, en vier vaste onderdelen:

- **Symptoom**: wat je zag. Vaak een foutmelding die naar iets anders wees.
- **Oorzaak**: wat er echt gebeurde.
- **Regel**: wat we sindsdien doen.
- **Afgedwongen door**: welk bestand, check of constraint de regel bewaakt. Staat er "alleen
  afspraak", dan is er geen vangnet en moet je het zelf onthouden.

Lees het bestand dat bij je taak hoort; de triggertabel staat in `CLAUDE.md` onder "Lessen en
patronen". De patronen (`docs/patronen/`) zeggen hoe je iets bouwt; de lessen zeggen waarom het zo
moet. Een les die zegt "(voorkomen)" bij het symptoom is in een eerder project op tijd gezien en
heeft daar nooit schade gedaan; hij staat hier zodat dat zo blijft.

| Bestand | Laag | Lessen |
|---|---|---|
| [drizzle-postgres](drizzle-postgres.md) | Drizzle en Postgres: migraties, query's, transacties, wachtrijen, het slot | L-DRZ-01 tot L-DRZ-18 |
| [neon](neon.md) | Neon: pooled en direct, branches, kosten, rechten, de rol van de app, de driver | L-NEON-01 tot L-NEON-11 |
| [nextjs](nextjs.md) | Next.js 16 en React 19, inclusief e2e met Playwright, de CSP en middleware | L-NEXT-01 tot L-NEXT-19 |
| [authjs](authjs.md) | Auth.js v5: identiteit, sessies, de dev-login, tokens, server actions | L-AUTH-01 tot L-AUTH-07 |
| [entra-graph](entra-graph.md) | Entra ID en Microsoft Graph: tenant, rollen, secrets, mail, gasten | L-ENTRA-01 tot L-ENTRA-09 |
| [vercel](vercel.md) | Vercel: de build, variabelen, crons, limieten, regio, plan | L-VRC-01 tot L-VRC-08 |
| [toolchain-windows](toolchain-windows.md) | De toolchain en Windows: pnpm, env-files, PowerShell, pins, strict | L-WIN-01 tot L-WIN-07 |
| [http-bestanden](http-bestanden.md) | Uploads, downloads, contenttype, CSV | L-HTTP-01 tot L-HTTP-04 |
| [werkwijze](werkwijze.md) | Werkwijze: versie, batterij, huisregels, koppelingen, fail closed, checks die iets bewijzen, de supply chain | L-WERK-01 tot L-WERK-12 |

## Een les toevoegen

Een les is iets dat tijd heeft gekost en opnieuw zou kunnen gebeuren. Schrijf hem pas op als je de
oorzaak kent, niet alleen de oplossing. Kies het volgende nummer in de laag, houd de vier onderdelen
aan, en kijk of er een goedkope check bestaat die de regel kan bewaken: een huisregel in
`scripts/house-rules/`, een constraint, een unittest. Een afspraak zonder vangnet is een wens (zie
L-WERK-03). Wijzig je een owned bestand in de templaterepo, dan hoort er een regel in
`template/CHANGELOG.md` bij; in een project schrijf je projectlessen in `docs/SPEC.md` of een eigen
bestand, want deze map wordt bij een update overschreven.
