import { ACTIONS, type Action } from "./actions";
import type { AppRole } from "./roles.generated";

/**
 * Wie mag wat. Eén regel per rol, en elke rol uit project.config.json moet hier staan: ontbreekt er
 * een, dan compileert dit niet.
 *
 * Een beheerdersrol krijgt alles. Elke andere rol begint met niets en krijgt per recht wat het
 * projectplan zegt (PROJECTPLAN 3: wie gebruikt het, en wat mag hij wel en niet). Er is geen
 * rij-niveau scoping in deze matrix: dat is een filter in de query, zie CLAUDE.md regel 11.
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export const MATRIX: Readonly<Record<AppRole, readonly Action[]>> = {
  admin: [...ACTIONS],
  member: [],
};
