/**
 * De eigen huisregels van dit project. Dit bestand is van het project en blijft staan bij een
 * update van het template.
 *
 * Een regel per bestand heeft de vorm (rel, text, report) en een regel over de hele repo de vorm
 * (root, report). `report` krijgt één zin met het pad en het regelnummer voorop, zoals de regels van
 * het template doen. Zet de functie in een eigen bestand in deze map en voeg hem hieronder toe.
 */

/** Regels die per bestand kijken. */
export const PROJECT_PER_FILE_RULES = [];

/** Regels die over de repo als geheel gaan. */
export const PROJECT_WHOLE_REPO_RULES = [];

/**
 * Eigen servermappen waaruit een clientcomponent geen waarde mag importeren, bovenop die van het
 * template (`@/lib/db`, `@/lib/integrations`, `@/lib/jobs`, `@/lib/messaging`, `@/lib/files`).
 * Bijvoorbeeld "@/lib/finance" als daar functies staan die eerst de rol asserten.
 */
export const PROJECT_SERVER_PREFIXES = [];
