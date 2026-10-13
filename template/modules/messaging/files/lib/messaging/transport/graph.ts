/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Mail via Microsoft Graph, uit een gedeelde postbus, met de app-registratie van de inlog. De
 * tenant komt uit de issuer van de inlog (`common` en `organizations` zijn geen tenant), het token
 * wordt per client-id gecachet, en bij 401 of 403 wordt één keer opnieuw geprobeerd met een vers
 * token: een net verleende consent zit niet in een oud token.
 *
 * Nodig in Entra: het applicatierecht `Mail.Send` met admin consent, en liefst een
 * ApplicationAccessPolicy die het beperkt tot de ene postbus. Zie docs/handleiding/20-graph-mail.md.
 */
import { fetchWithTimeout } from "@/lib/integrations/http";
import type { MailMessage, MailTransport } from "./types";

interface GraphConfig {
  readonly tenantId: string;
  readonly clientId: string;
  readonly clientSecret: string;
  readonly senderUpn: string;
}

function tenantFromIssuer(): string {
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "";
  const match = /login\.microsoftonline\.com\/([^/]+)/.exec(issuer);
  const tenant = match?.[1] ?? "";
  return tenant === "common" || tenant === "organizations" ? "" : tenant;
}

function readConfig(): GraphConfig | undefined {
  const tenantId = tenantFromIssuer();
  const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "";
  const clientSecret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? "";
  const senderUpn = process.env.GRAPH_SENDER_UPN ?? "";
  if (tenantId === "" || clientId === "" || clientSecret === "" || senderUpn === "") return undefined;
  return { tenantId, clientId, clientSecret, senderUpn };
}

function missingConfig(): string[] {
  const missing: string[] = [];
  if (tenantFromIssuer() === "") missing.push("AUTH_MICROSOFT_ENTRA_ID_ISSUER (met een echte tenant-id erin)");
  for (const name of ["AUTH_MICROSOFT_ENTRA_ID_ID", "AUTH_MICROSOFT_ENTRA_ID_SECRET", "GRAPH_SENDER_UPN"]) {
    if ((process.env[name] ?? "") === "") missing.push(name);
  }
  return missing;
}

const cachedTokens = new Map<string, { value: string; expiresAt: number }>();

async function accessToken(config: GraphConfig): Promise<string> {
  const cached = cachedTokens.get(config.clientId);
  if (cached !== undefined && Date.now() < cached.expiresAt) return cached.value;

  const response = await fetchWithTimeout(`https://login.microsoftonline.com/${config.tenantId}/oauth2/v2.0/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      scope: "https://graph.microsoft.com/.default",
      grant_type: "client_credentials",
    }),
  });
  if (!response.ok) throw new Error(`Token ophalen bij Entra mislukte met status ${response.status}. Controleer of de client secret nog geldig is.`);

  const payload = (await response.json()) as { access_token?: string; expires_in?: number };
  if (typeof payload.access_token !== "string") throw new Error("Entra gaf geen access_token terug.");
  const lifetimeSeconds = typeof payload.expires_in === "number" ? payload.expires_in : 3600;
  cachedTokens.set(config.clientId, { value: payload.access_token, expiresAt: Date.now() + (lifetimeSeconds - 300) * 1000 });
  return payload.access_token;
}

function notConfigured(): Error {
  return new Error(`Graph is niet ingericht. Ontbreekt: ${missingConfig().join(", ")}. Zie docs/handleiding/20-graph-mail.md.`);
}

async function sendOnce(config: GraphConfig, message: MailMessage, retried: boolean): Promise<void> {
  const token = await accessToken(config);
  const response = await fetchWithTimeout(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(config.senderUpn)}/sendMail`, {
    method: "POST",
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json" },
    body: JSON.stringify({
      message: {
        subject: message.subject,
        body: { contentType: "HTML", content: message.bodyHtml },
        toRecipients: [{ emailAddress: { address: message.toEmail } }],
      },
      saveToSentItems: true,
    }),
  });
  if ((response.status === 401 || response.status === 403) && !retried) {
    cachedTokens.delete(config.clientId);
    return sendOnce(config, message, true);
  }
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Graph weigerde de mail met status ${response.status}: ${detail.slice(0, 200)}`);
  }
}

export const graphTransport: MailTransport = {
  name: "Microsoft Graph",
  configured: () => readConfig() !== undefined,
  missing: missingConfig,
  send: async (message) => {
    const config = readConfig();
    if (config === undefined) throw notConfigured();
    await sendOnce(config, message, false);
  },
  verify: async () => {
    const config = readConfig();
    if (config === undefined) throw notConfigured();
    await accessToken(config);
    return `Token verkregen voor ${config.senderUpn}.`;
  },
};
