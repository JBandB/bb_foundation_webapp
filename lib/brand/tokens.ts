/* template-generated (tokens) uit project.config.json. Niet bewerken: pnpm template:generate schrijft hem opnieuw. */

/**
 * De enige plek buiten app/theme.css en app/project.css met een kleurwaarde, en alleen voor plekken
 * die geen CSS-variabele kunnen lezen: de theme-color van de browser, de foutpagina zonder
 * stylesheet, en de opmaak van een mail (die staat als `style` op elk element, want dat is het
 * enige dat Outlook, Gmail en een telefoon alle drie hetzelfde doen).
 *
 * Componenten gebruiken deze waarden niet; zij gebruiken de tokens. `pnpm lint:house` controleert
 * dat elke waarde hier ook in theme.css of project.css staat, zodat er geen tweede waarheid ontstaat.
 */
export const brandColors = {
  primary: "#1f4e79",
  accent: "#0f766e",
  surface: "#f6f7f9",
  ink: "#1b1f24",
  /** De rail en de tabbalk van de browser: het merk, niet de modus. */
  sidebar: "#11283e",
  /** Voor mail: zachte tekst, een lijn en het papier. */
  soft: "#5f646a",
  line: "#c8c9cb",
  paper: "#ffffff",
} as const;
