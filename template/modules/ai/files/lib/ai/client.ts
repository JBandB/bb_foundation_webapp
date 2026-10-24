/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De aanroep van de Claude API, met de officiële SDK. De SDK praat via de enige fetch naar buiten van
 * het template (lib/integrations/http.ts), met een eigen tijdslimiet: nadenken kost tijd, maar een
 * knop hoort niet langer dan een minuut te wachten. Eén nieuwe poging bij een tijdelijke fout, niet
 * meer: elke poging kost geld.
 *
 * Alleen op de server. De sleutel komt uit `ANTHROPIC_API_KEY` en komt nooit in de browser, in een log
 * of in de database.
 */
import Anthropic from "@anthropic-ai/sdk";
import { fetchWithTimeout } from "@/lib/integrations/http";
import { AI_TIMEOUT_MS } from "./models";

export const AI_KEY_ENV = "ANTHROPIC_API_KEY";

export function aiKey(): string | undefined {
  const key = process.env[AI_KEY_ENV];
  return key !== undefined && key.trim() !== "" ? key.trim() : undefined;
}

export function aiClient(apiKey: string): Anthropic {
  return new Anthropic({
    apiKey,
    maxRetries: 1,
    timeout: AI_TIMEOUT_MS,
    fetch: (input, init) => fetchWithTimeout(input instanceof Request ? input.url : String(input), init, AI_TIMEOUT_MS),
  });
}

export interface ClaudeRequest {
  readonly model: string;
  readonly system: string;
  readonly message: string;
  readonly effort: "low" | "medium" | "high";
  readonly maxTokens: number;
  readonly schema: { readonly [key: string]: unknown };
}

/** Eén verzoek, met de vaste structuur als JSON-schema (structured outputs). */
export async function askClaude(apiKey: string, request: ClaudeRequest): Promise<Anthropic.Message> {
  return aiClient(apiKey).messages.create({
    model: request.model,
    max_tokens: request.maxTokens,
    system: request.system,
    messages: [{ role: "user", content: request.message }],
    output_config: { effort: request.effort, format: { type: "json_schema", schema: { ...request.schema } } },
  });
}

/** Een korte reden bij een fout van de API, zonder inhoud en zonder sleutel. */
export function apiErrorReason(error: unknown): string {
  if (error instanceof Anthropic.AuthenticationError) return "authentication: de sleutel klopt niet of staat uit";
  if (error instanceof Anthropic.PermissionDeniedError) return "permission: deze sleutel mag dit model of deze workspace niet gebruiken";
  if (error instanceof Anthropic.NotFoundError) return "not found: dit model bestaat niet (meer)";
  if (error instanceof Anthropic.RateLimitError) return "rate limit: te veel verzoeken, of de uitgavenlimiet is bereikt";
  if (error instanceof Anthropic.BadRequestError) return `bad request: ${error.message.slice(0, 200)}`;
  if (error instanceof Anthropic.APIConnectionTimeoutError) return "timeout: geen antwoord binnen de tijdslimiet";
  if (error instanceof Anthropic.APIConnectionError) return "connection: de API was niet bereikbaar";
  if (error instanceof Anthropic.APIError) return `api ${String(error.status ?? "")}: ${error.message.slice(0, 200)}`;
  if (error instanceof Error && error.name === "TimeoutError") return "timeout: geen antwoord binnen de tijdslimiet";
  return error instanceof Error ? error.message.slice(0, 200) : String(error).slice(0, 200);
}
