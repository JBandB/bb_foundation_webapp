/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Een bericht naar een Teams-kanaal via een inkomende webhook (Workflows). Alleen als
 * `messaging.teams` in project.config.json aan staat én de webhook er is; anders blijven
 * Teams-berichten in de outbox staan met de melding wat er ontbreekt.
 */
import { PROJECT } from "@/lib/project/config.generated";

export const TEAMS_WEBHOOK = "TEAMS_WEBHOOK_URL";

export function teamsConfigured(): boolean {
  return PROJECT.messaging.teams && (process.env[TEAMS_WEBHOOK] ?? "").trim() !== "";
}

export function teamsMissing(): string[] {
  if (!PROJECT.messaging.teams) return [];
  return teamsConfigured() ? [] : [TEAMS_WEBHOOK];
}

export async function sendTeams(message: { readonly subject: string; readonly bodyMd: string }): Promise<void> {
  const url = (process.env[TEAMS_WEBHOOK] ?? "").trim();
  if (url === "") throw new Error(`${TEAMS_WEBHOOK} ontbreekt, dus er kan niets naar Teams.`);

  const response = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(card(message)),
    signal: AbortSignal.timeout(20_000),
  });
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(`Teams gaf status ${response.status}. ${detail.slice(0, 200)}`);
  }
}

function card(message: { readonly subject: string; readonly bodyMd: string }): unknown {
  return {
    type: "message",
    attachments: [
      {
        contentType: "application/vnd.microsoft.card.adaptive",
        contentUrl: null,
        content: {
          $schema: "http://adaptivecards.io/schemas/adaptive-card.json",
          type: "AdaptiveCard",
          version: "1.4",
          body: [
            { type: "TextBlock", text: withoutMarkdownLinks(message.subject), weight: "Bolder", wrap: true },
            { type: "TextBlock", text: withoutMarkdownLinks(message.bodyMd), wrap: true },
          ],
        },
      },
    ],
  };
}

/** Een adaptive card maakt van `[tekst](url)` een koppeling met de tekst als label; een spatie ertussen laat de url staan. */
export function withoutMarkdownLinks(text: string): string {
  return text.replace(/\]\s*\(/g, "] (");
}
