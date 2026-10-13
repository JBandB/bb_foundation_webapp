/**
 * De handelingen die dit project in de audit log zet, bovenop insert, update, delete en restore uit
 * het template.
 *
 * Een vaste lijst en geen vrije tekst, zodat een overzicht over de log kan groeperen zonder eerst te
 * moeten ontdekken dat er zowel `submit` als `submitted` in staat. Voeg een waarde toe als een
 * handeling meer zegt dan "update", bijvoorbeeld `approve` of `publish`.
 *
 *     export type ProjectAuditAction = "approve" | "publish";
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export type ProjectAuditAction = never;
