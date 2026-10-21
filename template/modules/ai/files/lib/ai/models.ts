/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Welke modellen Beheer, AI als suggestie toont. Dit is geen keuze: de beheerder kiest per prompt, en
 * mag elk model-id typen dat de Console kent. Modellen worden na een aankondiging uitgezet; een update
 * van het template ververst deze lijst, een prompt houdt zijn eigen keuze tot de beheerder hem
 * omzet, na de testgevallen (docs/modules/ai.md, Onderhoud).
 */
import type { AiEffort } from "@/lib/db/schema";

export const MODEL_SUGGESTIONS: readonly string[] = ["claude-haiku-5-5", "claude-sonnet-5-5", "claude-opus-5-5"];

export const EFFORTS: readonly AiEffort[] = ["low", "medium", "high"];

const MODEL_ID = /^[a-z0-9][a-z0-9.-]{2,63}$/;

/** Een model-id zoals de Console het noemt: kleine letters, cijfers, punten en koppeltekens. */
export function isModelId(value: string): boolean {
  return MODEL_ID.test(value);
}

/** Hoe lang één verzoek mag duren. Nadenken kost tijd; langer wachten heeft voor een knop geen zin. */
export const AI_TIMEOUT_MS = 60_000;
