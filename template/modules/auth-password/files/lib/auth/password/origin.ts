/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { headers } from "next/headers";
import { PROJECT } from "@/lib/project/config.generated";

/**
 * De basis van de koppelingen in een mail: het adres van de deploy. Uit AUTH_URL als die er is
 * (lokaal en in de e2e), anders het productieadres uit de configuratie, anders de host van het
 * verzoek. Nooit een pad uit de browser, want dat kan een vreemde meesturen.
 */
export async function appOrigin(): Promise<string> {
  const configured = process.env.AUTH_URL ?? PROJECT.productionUrl ?? "";
  if (configured !== "") return configured.replace(/\/+$/, "");
  try {
    const incoming = await headers();
    const host = incoming.get("x-forwarded-host") ?? incoming.get("host") ?? "";
    if (host !== "") return `https://${host}`;
  } catch {
    /* Geen verzoek in uitvoering. */
  }
  throw new Error("Geen adres bekend voor de koppeling in de mail: zet AUTH_URL of productionUrl.");
}
