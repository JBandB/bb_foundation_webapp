/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { headers } from "next/headers";
import { deployEnvironment } from "@/lib/domain/deploy-environment";
import { PROJECT } from "@/lib/project/config.generated";

/**
 * De basis van de koppelingen in een mail: het adres van de deploy. Uit AUTH_URL als die er is
 * (lokaal en in de e2e), anders het productieadres uit de configuratie. Nooit een pad uit de
 * browser, want dat kan een vreemde meesturen.
 *
 * **De host van het verzoek alleen waar die niet te vervalsen is.** Een herstelkoppeling die uit
 * `Host` of `X-Forwarded-Host` wordt gebouwd, stuurt een aanvaller met een vervalste header naar
 * zijn eigen domein, in een echte mail van ons (reset poisoning). Op Vercel zet het platform
 * `x-forwarded-host` zelf en overschrijft het wat een client stuurt, dus daar is hij te vertrouwen:
 * zo werkt een preview zonder `productionUrl`. Lokaal is de host van de dev-server onschuldig. Op
 * een andere host zonder configuratie weigeren we: liever geen mail dan een mail met een vreemd adres.
 */
export async function appOrigin(): Promise<string> {
  const configured = process.env.AUTH_URL ?? PROJECT.productionUrl ?? "";
  if (configured !== "") return configured.replace(/\/+$/, "");

  const onVercel = (process.env.VERCEL ?? "") !== "";
  if (onVercel || deployEnvironment() === "local") {
    try {
      const incoming = await headers();
      const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "";
      if (host !== "") return `${onVercel ? "https" : "http"}://${host}`;
    } catch {
      /* Geen verzoek in uitvoering. */
    }
  }
  throw new Error("Geen adres bekend voor de koppeling in de mail: zet AUTH_URL of productionUrl.");
}
