import type { AiPrompt } from "./prompts";

/**
 * De prompts van dit project: elk één taak, met een vaste instructie, de velden die naar Claude gaan
 * en de vaste structuur van het antwoord. Zie docs/modules/ai.md.
 *
 * Beheer, AI toont ze; daar kiest een beheerder per prompt of hij aan staat, het model, het
 * denkniveau en de daglimiet. Zonder die keuze staat een prompt uit, ook al staat hij hier.
 *
 * Verander je de instructie, de velden of de structuur, verhoog dan `version`, en draai je
 * testgevallen opnieuw. De sleutel verandert nooit.
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export const PROJECT_PROMPTS: readonly AiPrompt[] = [];
