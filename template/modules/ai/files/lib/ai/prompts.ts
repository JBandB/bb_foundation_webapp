/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De vorm van een prompt in de catalogus. De prompts zelf staan in `lib/ai/catalogue.ts`, van het
 * project. Een prompt is altijd één taak: een vaste instructie, de velden die meegaan, en een vaste
 * structuur voor het antwoord. AI vult de inhoud; de tool bepaalt de vorm.
 *
 * Elke wijziging aan de instructie, de velden of de structuur verhoogt `version`. Zo staat bij elk
 * verzoek in `ai_requests` met welke versie het liep, en kun je terug als een versie slechter blijkt.
 */
import type { AiEffort } from "@/lib/db/schema";
import { PROJECT_PROMPTS } from "./catalogue";

export type AiOutputKind = "short" | "long" | "choice" | "number" | "yesno" | "list";

export interface AiListItemField {
  /** De sleutel in het schema: Engels, kleine letters en liggende streepjes. */
  readonly key: string;
  /** Het label in het scherm, in de taal van de interface. */
  readonly label: string;
}

export interface AiOutputField {
  readonly key: string;
  readonly label: string;
  readonly kind: AiOutputKind;
  /** Bij een keuze: de toegestane waarden, met een uitweg zoals Overig. */
  readonly options?: readonly string[];
  /** Bij korte of lange tekst: hoogstens zoveel tekens. */
  readonly maxLength?: number;
  /** Bij een getal: de grenzen, inclusief. */
  readonly min?: number;
  readonly max?: number;
  /** Bij een lijst: hoogstens zoveel items. */
  readonly maxItems?: number;
  /** Bij een lijst van onderdelen: de velden van elk item. Leeg: een lijst van korte teksten. */
  readonly items?: readonly AiListItemField[];
}

export interface AiPrompt {
  /** Kleine letters, cijfers en liggende streepjes. Verandert nooit: instellingen en verbruik hangen eraan. */
  readonly key: string;
  readonly version: number;
  /** De naam in Beheer, AI. */
  readonly title: string;
  /**
   * De vaste instructie, als systeemtekst, letterlijk zoals hij naar Claude gaat: rol, taak, vaste
   * informatie, zo kies je, de vaste onderdelen, voorbeelden en regels (zie docs/modules/ai.md). De
   * module dwingt de structuur daarnaast af met een schema uit `output`.
   */
  readonly instruction: string;
  /** De velden die naar Claude gaan, als labels, in deze volgorde. Niets anders gaat mee. */
  readonly fields: readonly string[];
  readonly output: readonly AiOutputField[];
  /** Het denkniveau als een beheerder nog niets koos. */
  readonly defaultEffort: AiEffort;
  /** Hoogstens zoveel output-tokens, nadenken inbegrepen. Standaard 8000. */
  readonly maxTokens?: number;
}

export const DEFAULT_MAX_TOKENS = 8000;

const KEY = /^[a-z][a-z0-9_]{1,39}$/;

/** Alle prompts van het project. */
export const AI_PROMPTS: readonly AiPrompt[] = PROJECT_PROMPTS;

export function promptFor(key: string): AiPrompt | undefined {
  return AI_PROMPTS.find((prompt) => prompt.key === key);
}

/** Wat er mis is met de catalogus, in gewone taal. Leeg als alles klopt; `pnpm check:ai` toont het. */
export function catalogueProblems(prompts: readonly AiPrompt[] = AI_PROMPTS): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const prompt of prompts) {
    const where = `prompt ${prompt.key}`;
    if (!KEY.test(prompt.key)) problems.push(`${where}: de sleutel is geen kleine letters, cijfers en liggende streepjes`);
    if (seen.has(prompt.key)) problems.push(`${where}: de sleutel komt twee keer voor`);
    seen.add(prompt.key);
    if (!Number.isInteger(prompt.version) || prompt.version < 1) problems.push(`${where}: de versie is geen heel getal vanaf 1`);
    if (prompt.instruction.trim().length < 20) problems.push(`${where}: de instructie is te kort`);
    if (prompt.fields.length === 0) problems.push(`${where}: er gaat geen enkel veld mee`);
    if (prompt.output.length === 0) problems.push(`${where}: het antwoord heeft geen onderdelen`);
    const keys = new Set<string>();
    for (const field of prompt.output) {
      if (!KEY.test(field.key)) problems.push(`${where}: onderdeel ${field.key} heeft geen geldige sleutel`);
      if (keys.has(field.key)) problems.push(`${where}: onderdeel ${field.key} komt twee keer voor`);
      keys.add(field.key);
      if (field.kind === "choice" && (field.options === undefined || field.options.length < 2)) problems.push(`${where}: keuze ${field.key} heeft minder dan twee opties`);
      if (field.kind === "number" && field.min !== undefined && field.max !== undefined && field.min > field.max) problems.push(`${where}: getal ${field.key} heeft een ondergrens boven de bovengrens`);
      for (const item of field.items ?? []) if (!KEY.test(item.key)) problems.push(`${where}: lijst ${field.key} heeft een item zonder geldige sleutel`);
    }
  }
  return problems;
}
