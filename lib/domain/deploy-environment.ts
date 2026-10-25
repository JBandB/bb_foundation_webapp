/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * In welke omgeving deze code draait: lokaal, preview, productie, of onbekend.
 *
 * **Guards op `VERCEL_ENV` vallen buiten Vercel stil open.** De dev-login gooide als `VERCEL_ENV`
 * bestond, en de migratie bij een deploy controleerde alleen bij `VERCEL_ENV=preview` of hij niet op
 * productie uitkwam. Op een andere host bestaat die variabele niet: een verdwaalde
 * `AUTH_DEV_LOGIN=1` gaf daar een inlog waarin je zelf je rollen kiest, en een preview-build migreerde
 * zonder controle.
 *
 * **Daarom één functie, en een uitdrukkelijke `APP_ENV`.** `APP_ENV` wint als hij er is (`local`,
 * `preview` of `production`); anders telt `VERCEL_ENV` (`production` of `preview`); anders is de
 * omgeving onbekend. Alles wat een guard is, kiest de veilige kant bij "onbekend": de dev-login gaat
 * alleen aan bij `APP_ENV=local` (die `.env.local` en `playwright.config.ts` zetten), en een migratie
 * buiten productie controleert altijd of hij niet op productie uitkomt. `NODE_ENV` is geen
 * alternatief, want de e2e draait `next start` in productiemodus met de dev-login aan.
 *
 * Puur: de omgeving gaat als argument mee, zodat hij zonder de echte omgeving te testen is.
 */

export type DeployEnvironment = "local" | "preview" | "production" | "unknown";

export function deployEnvironment(env: Readonly<Record<string, string | undefined>> = process.env): DeployEnvironment {
  const explicit = (env["APP_ENV"] ?? "").trim();
  if (explicit === "local" || explicit === "preview" || explicit === "production") return explicit;

  const vercel = (env["VERCEL_ENV"] ?? "").trim();
  if (vercel === "production" || vercel === "preview") return vercel;

  return "unknown";
}
