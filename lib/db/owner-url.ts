/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { deployEnvironment } from "@/lib/domain/deploy-environment";

/**
 * De directe verbinding als eigenaar van de database, voor wat niet als de rol van de app kan: de
 * migraties bij een uitrol (DDL) en de scripts.
 *
 * ---
 *
 * **Waarom een eigen variabele.** `DATABASE_URL` en `DATABASE_URL_UNPOOLED` beheert de koppeling
 * tussen Neon en Vercel, en die zijn bij een via de Vercel Marketplace afgenomen Neon-project niet
 * met de hand te wijzigen. Het wachtwoord van de eigenaar draaien liep daar in een eerder project op
 * vast: "Rotate secrets" in Vercel pakt volgens meldingen de verkeerde branch, en een "Reset
 * password" in Neon neemt Vercel niet over. `DATABASE_URL_OWNER` zet je zelf, alleen op Production,
 * en dan is draaien: Reset password in Neon, deze variabele bijwerken, uitrollen. Zie
 * docs/handleiding/30-beveiliging-en-kosten.md.
 *
 * **Alleen in productie.** Een vaste waarde in een preview of lokaal zou elke preview en elk script op
 * de productiedatabase zetten, dus daar telt hij niet, ook niet als iemand hem per ongeluk zet. Daar
 * blijft het de verbinding van de koppeling of van `.env.local`, per branch.
 *
 * Puur, op de omgeving die binnenkomt, zodat het los te toetsen is.
 */
export function ownerUrl(env: Readonly<Record<string, string | undefined>> = process.env): string | undefined {
  if (deployEnvironment(env) === "production") {
    const own = (env["DATABASE_URL_OWNER"] ?? "").trim();
    if (own !== "") return own;
  }

  const unpooled = (env["DATABASE_URL_UNPOOLED"] ?? "").trim();
  if (unpooled !== "") return unpooled;

  const pooled = (env["DATABASE_URL"] ?? "").trim();
  return pooled === "" ? undefined : pooled;
}
