/**
 * De versie van deze applicatie, op één plek. Zie CLAUDE.md, Versie.
 *
 * Elke pull request levert een versie op en heet ernaar, bijvoorbeeld `v0.02: eerste specificatie`.
 * De tweede positie loopt per PR op; de eerste gaat alleen omhoog als de eigenaar van het project
 * dat zegt. De versie staat linksonder in de rail en op het inlogscherm, zodat "werkt het al?"
 * altijd te beantwoorden is: een reparatie kan gemerged zijn en toch nog niet in de browser staan.
 */
export const APP_VERSION = "v0.01";

/**
 * Wat er nieuw is, voor het inlogscherm. Hooguit drie regels in gewone taal, in de taal van de
 * interface, en per PR ververst net als het nummer erboven. Dat scherm is technisch publiek, dus hier
 * staat nooit een klantnaam of een bedrag.
 */
export const APP_HIGHLIGHTS: readonly string[] = ["Het project is aangemaakt uit het template."];
