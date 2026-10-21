/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `runPrompt`: de enige manier waarop de tool Claude aanroept. Een server action van het project
 * roept hem aan met de prompt uit de catalogus en de waarden van het scherm, en krijgt een voorstel
 * in de vaste structuur terug, of een reden waarom niet. Opslaan doet het project pas als een mens
 * het voorstel bevestigt.
 *
 * Een AI-aanroep is geen schrijfactie naar buiten: hij verandert daar niets. Daarom loopt hij
 * synchroon, niet via de outbox of de wachtrij (docs/modules/ai.md, besluit A1). Wat hem begrenst is
 * de daglimiet per persoon hier en de uitgavenlimiet in de Console.
 *
 * Elke poging die de API bereikt, staat als regel in `ai_requests`, met de tokens en de prijs van dat
 * moment, nooit met de inhoud.
 */
import type Anthropic from "@anthropic-ai/sdk";
import type { Actor } from "@/lib/auth/actor";
import { assertCan } from "@/lib/auth/can";
import type { DbOrTransaction } from "@/lib/db/client";
import type { AiRequestStatus } from "@/lib/db/schema";
import { todayIso } from "@/lib/domain/dates";
import { apiErrorReason, askClaude, aiKey } from "./client";
import { buildUserMessage } from "./message";
import { DEFAULT_MAX_TOKENS, promptFor, type AiPrompt } from "./prompts";
import { loadPromptSetting, priceFor } from "./settings";
import { outputSchema, validateProposal, type Proposal } from "./structure";
import { countToday, logRequest } from "./usage";

export type AiFailure = "unknownPrompt" | "off" | "noKey" | "limit" | "refused" | "invalid" | "failed";

export type AiOutcome =
  | { readonly ok: true; readonly requestId: string; readonly proposal: Proposal }
  | { readonly ok: false; readonly reason: AiFailure; readonly requestId?: string };

export interface Interpreted {
  readonly status: AiRequestStatus;
  readonly proposal: Proposal | null;
  readonly error: string | null;
}

/** Het deel van een antwoord van de API dat ertoe doet. */
export interface ApiAnswer {
  readonly stop_reason: string | null;
  readonly content: readonly { readonly type: string; readonly text?: string }[];
}

/** Puur: wat het antwoord van de API betekent voor deze prompt. */
export function interpret(prompt: AiPrompt, message: ApiAnswer): Interpreted {
  if (message.stop_reason === "refusal") return { status: "refused", proposal: null, error: "refusal: Claude weigerde dit verzoek" };
  if (message.stop_reason === "max_tokens") return { status: "invalid", proposal: null, error: "max_tokens: het antwoord paste niet binnen het maximum" };
  const text = message.content.flatMap((block) => (block.type === "text" && block.text !== undefined ? [block.text] : [])).join("");
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { status: "invalid", proposal: null, error: "het antwoord is geen geldige JSON" };
  }
  const checked = validateProposal(prompt.output, parsed);
  return checked.ok ? { status: "ok", proposal: checked.proposal, error: null } : { status: "invalid", proposal: null, error: checked.problem };
}

export async function runPrompt(db: DbOrTransaction, actor: Actor, promptKey: string, values: Readonly<Record<string, string | null | undefined>>): Promise<AiOutcome> {
  assertCan(actor, "ai:use");
  const prompt = promptFor(promptKey);
  if (prompt === undefined) return { ok: false, reason: "unknownPrompt" };
  const setting = await loadPromptSetting(db, actor.organisationId, promptKey);
  if (setting === undefined || !setting.enabled || setting.model === null) return { ok: false, reason: "off" };
  const apiKey = aiKey();
  if (apiKey === undefined) return { ok: false, reason: "noKey" };

  const day = todayIso();
  if ((await countToday(db, actor.organisationId, actor.id, promptKey, day)) >= setting.dailyLimit) return { ok: false, reason: "limit" };

  const price = await priceFor(db, actor.organisationId, setting.model);
  const base = {
    organisationId: actor.organisationId,
    userId: actor.id,
    promptKey,
    promptVersion: prompt.version,
    model: setting.model,
    day,
    inputCentsPerMtok: price?.inputCentsPerMtok ?? null,
    outputCentsPerMtok: price?.outputCentsPerMtok ?? null,
    currency: price?.currency ?? null,
  };

  const started = Date.now();
  let message: Anthropic.Message;
  try {
    message = await askClaude(apiKey, {
      model: setting.model,
      system: prompt.instruction,
      message: buildUserMessage(prompt.fields, values),
      effort: setting.effort,
      maxTokens: prompt.maxTokens ?? DEFAULT_MAX_TOKENS,
      schema: outputSchema(prompt.output),
    });
  } catch (error) {
    const requestId = await logRequest(db, { ...base, status: "failed", inputTokens: 0, outputTokens: 0, durationMs: Date.now() - started, error: apiErrorReason(error) });
    return { ok: false, reason: "failed", requestId };
  }

  const outcome = interpret(prompt, message);
  const requestId = await logRequest(db, {
    ...base,
    status: outcome.status,
    inputTokens: message.usage.input_tokens,
    outputTokens: message.usage.output_tokens,
    durationMs: Date.now() - started,
    error: outcome.error,
  });
  if (outcome.proposal !== null) return { ok: true, requestId, proposal: outcome.proposal };
  return { ok: false, reason: outcome.status === "refused" ? "refused" : "invalid", requestId };
}
