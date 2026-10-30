/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De guards rond het productie-endpoint, als beslissing zonder omgeving en zonder verbinding. Het
 * lezen van de omgeving en het weigeren staat in de scripts; hier staan de regels en de meldingen,
 * zodat die los te toetsen zijn.
 *
 * ---
 *
 * **Twee spiegelbeelden.** `productionVerdict` zegt of een script op dit endpoint mag werken: een
 * preview-deploy die migreert (`db:deploy`) en de inlogrol van de app aanmaken (`db:app-login`)
 * mogen nooit op productie uitkomen. Fail closed: staat `PRODUCTION_DB_ENDPOINT` niet ingesteld,
 * dan is dat niet te controleren, en dan gaan we er niet van uit dat het goed zit.
 * `productionTargetVerdict` is het omgekeerde: een productiedeploy moet juist op productie uitkomen.
 *
 * **Waarom het tweede bestaat.** Met `DATABASE_URL_OWNER` (lib/db/owner-url.ts) zet iemand de
 * verbinding van de migraties met de hand; een verkeerd geplakte waarde zou dan een andere database
 * migreren. Is niet bekend welk endpoint productie is, dan migreert hij wel: zo zat productie altijd
 * al, en de preview-guard eist de variabele toch al.
 */

export type GuardVerdict = "allowed" | "unknown" | "production";

/** Mag een script op dit endpoint werken? Het endpoint-id uit de verbinding, en dat van productie. */
export function productionVerdict(endpoint: string, production: string | undefined): GuardVerdict {
  const known = production?.trim() ?? "";
  if (known === "") return "unknown";
  return endpoint === known ? "production" : "allowed";
}

/** Mag een productiedeploy op dit endpoint migreren? */
export function productionTargetVerdict(endpoint: string, production: string | undefined): "allowed" | "elsewhere" {
  const known = production?.trim() ?? "";
  return known === "" || endpoint === known ? "allowed" : "elsewhere";
}

/** De melding als een productiedeploy naar een andere database wijst. */
export function productionTargetMessage(endpoint: string, production: string): string {
  return [
    `Deze productiedeploy wijst naar ${endpoint}, maar productie is ${production.trim()}. Er is niets gemigreerd.`,
    "",
    "Kijk in Vercel, Settings, Environment Variables, scope Production, naar DATABASE_URL_OWNER",
    "(of zonder die variabele naar DATABASE_URL_UNPOOLED van de integratie). De host moet met het",
    "endpoint van productie beginnen. Zie docs/handleiding/30-beveiliging-en-kosten.md.",
  ].join("\n");
}
