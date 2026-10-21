/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De vaste structuur van een antwoord: het JSON-schema dat Claude met structured outputs volgt, en de
 * controle achteraf. Het schema draagt geen grenzen in tekens of aantallen: structured outputs kent
 * die niet. Die staan in de beschrijving van het veld, en `validateProposal` controleert ze na afloop.
 * Een antwoord dat niet past, wordt nooit getoond.
 */
import type { AiOutputField } from "./prompts";

export type JsonSchema = { readonly [key: string]: unknown };

function describe(field: AiOutputField): string {
  const parts = [field.label];
  if (field.maxLength !== undefined) parts.push(`hoogstens ${field.maxLength} tekens`);
  if (field.min !== undefined || field.max !== undefined) parts.push(`van ${field.min ?? "?"} tot ${field.max ?? "?"}`);
  if (field.maxItems !== undefined) parts.push(`hoogstens ${field.maxItems} items`);
  return parts.join(", ");
}

function fieldSchema(field: AiOutputField): JsonSchema {
  const description = describe(field);
  switch (field.kind) {
    case "choice":
      return { type: "string", enum: [...(field.options ?? [])], description };
    case "number":
      return { type: "number", description };
    case "yesno":
      return { type: "boolean", description };
    case "list": {
      const items = field.items ?? [];
      if (items.length === 0) return { type: "array", items: { type: "string" }, description };
      return {
        type: "array",
        description,
        items: {
          type: "object",
          properties: Object.fromEntries(items.map((item) => [item.key, { type: "string", description: item.label }])),
          required: items.map((item) => item.key),
          additionalProperties: false,
        },
      };
    }
    default:
      return { type: "string", description };
  }
}

/** Het schema voor `output_config.format`: elk onderdeel verplicht, niets anders toegestaan. */
export function outputSchema(fields: readonly AiOutputField[]): JsonSchema {
  return {
    type: "object",
    properties: Object.fromEntries(fields.map((field) => [field.key, fieldSchema(field)])),
    required: fields.map((field) => field.key),
    additionalProperties: false,
  };
}

export type ProposalValue = string | number | boolean | readonly string[] | readonly Readonly<Record<string, string>>[];
export type Proposal = Readonly<Record<string, ProposalValue>>;
export type ValidationResult = { readonly ok: true; readonly proposal: Proposal } | { readonly ok: false; readonly problem: string };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

function checkField(field: AiOutputField, value: unknown): string | null {
  switch (field.kind) {
    case "short":
    case "long":
      if (typeof value !== "string") return `${field.key} is geen tekst`;
      if (field.maxLength !== undefined && value.length > field.maxLength) return `${field.key} is langer dan ${field.maxLength} tekens`;
      return null;
    case "choice":
      if (typeof value !== "string" || !(field.options ?? []).includes(value)) return `${field.key} is geen van de keuzes`;
      return null;
    case "number":
      if (typeof value !== "number" || !Number.isFinite(value)) return `${field.key} is geen getal`;
      if ((field.min !== undefined && value < field.min) || (field.max !== undefined && value > field.max)) return `${field.key} valt buiten de grenzen`;
      return null;
    case "yesno":
      return typeof value === "boolean" ? null : `${field.key} is geen ja of nee`;
    case "list": {
      if (!Array.isArray(value)) return `${field.key} is geen lijst`;
      if (field.maxItems !== undefined && value.length > field.maxItems) return `${field.key} heeft meer dan ${field.maxItems} items`;
      const items = field.items ?? [];
      if (items.length === 0) return value.every((entry) => typeof entry === "string") ? null : `${field.key} bevat iets anders dan tekst`;
      const ok = value.every((entry) => isRecord(entry) && Object.keys(entry).length === items.length && items.every((item) => typeof entry[item.key] === "string"));
      return ok ? null : `${field.key} bevat een item zonder de vaste onderdelen`;
    }
  }
}

/** Past het antwoord precies in de structuur? Zo niet, dan zegt het eerste probleem waarom. */
export function validateProposal(fields: readonly AiOutputField[], value: unknown): ValidationResult {
  if (!isRecord(value)) return { ok: false, problem: "het antwoord is geen object" };
  const extra = Object.keys(value).filter((key) => !fields.some((field) => field.key === key));
  if (extra.length > 0) return { ok: false, problem: `onbekende onderdelen: ${extra.join(", ")}` };
  for (const field of fields) {
    if (!(field.key in value)) return { ok: false, problem: `${field.key} ontbreekt` };
    const problem = checkField(field, value[field.key]);
    if (problem !== null) return { ok: false, problem };
  }
  return { ok: true, proposal: value as Proposal };
}
