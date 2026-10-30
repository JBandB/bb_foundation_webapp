<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Module core

Altijd aanwezig. Wat elk project krijgt voordat het één regel eigen code heeft.

## Wat erin zit

- **Toolchain** met vastgepinde versies (Next.js, TypeScript, ESLint, Drizzle, Tailwind), de
  huisregels (`scripts/house-rules/`), de contrastcheck, de migratiechecks, de CI, en de security
  headers met een CSP die per verzoek een nonce draagt (`proxy.ts`, `lib/security/csp.ts`).
- **Thema** in twee modi, gegenereerd uit de acht merkkleuren; de UI-kit in `components/ui/`; de rail,
  foutpagina's, Over de tool met release notes, roadmap en besluiten.
- **Inloggen en sessie**: Auth.js met een JWT van acht uur, de dev-login voor lokaal, `requireSession`
  en `can()` met de rechtenmatrix van het project (`lib/auth/actions.ts`, `lib/auth/matrix.ts`).
  Welke inlogmodule, zegt de configuratie.
- **Database**: Neon via Drizzle, één codepad (`getDb()`), de tabellen `organisations`, `users`,
  `audit_log` (append-only met trigger), `user_preferences`, `rate_limits`, `tool_feedback`; de
  baseline-migraties; de rol van de app `app_rw` (geen DDL, de audit log alleen aanvullen) met
  `DATABASE_URL_APP`, en Row Level Security op elke tabel met één regel voor die rol
  (`appRowAccess()`); de scripts `db:migrate|down|deploy|status|bootstrap|seed|roundtrip|app-login`.
- **Beheer**: Toegang (wie, met welke rol), Systeem (versie, schema, koppelingen), Feedback.
- **Achtergrond**: de cron `/api/cron/prune` met het geheim `CRON_SECRET`, en `pnpm task:prune`.
- **Foutrapportage**: `instrumentation.ts` vangt elke serverfout met `onRequestError` en geeft hem aan
  `lib/monitoring/report.ts`, dat de melding en de stack schoonmaakt (parameters, sleutelwaarden,
  mailadressen, tokens) en naar de log van Vercel schrijft. Het doorsturen naar een foutenmonitor is
  de gereserveerde module `monitoring-sentry`.
- **Helpers zonder domein**: `fetchWithTimeout` (de enige `fetch` naar buiten), `csv-safe` voor
  exports die Excel goed opent, datums in de tijdzone van het project, de rate limiter in de database.
- **Bewijs**: `pnpm check:core`, `pnpm check:grants`, de e2e-basisset `00` tot `05` plus `05b` (de
  CSP), `pnpm smoke:prod`.

## Wat het project levert

`project.config.json` (uit een wizard, of zelf op basis van `examples/`), `docs/PROJECTPLAN.md`, de rechten en de matrix, de teksten in
`lib/i18n/domain/`, de navigatie (`app/(app)/nav.project.ts`), het beginscherm, de eigen tabellen
onder `lib/db/schema/index.ts`, en de eigen checks en e2e vanaf `10`.

## Variabelen

`DATABASE_URL`, `DATABASE_URL_UNPOOLED`, `AUTH_SECRET`, `PRODUCTION_DB_ENDPOINT`, `CRON_SECRET`
(Vercel), `AUTH_DEV_LOGIN` en `SEED_TARGET` (lokaal), `DATABASE_URL_APP` (Production met de hand,
lokaal door `pnpm db:app-login`) en `DATABASE_URL_OWNER` (alleen Production, alleen bij het draaien
van het wachtwoord van de eigenaar). Zie handleiding 04, 06, 07 en 30.
