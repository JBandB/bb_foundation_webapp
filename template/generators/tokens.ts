/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Schrijft lib/brand/tokens.ts: de paar kleurwaarden voor plekken die geen CSS-variabele kunnen lezen.
 * Elke waarde komt uit het lichte palet, zodat de huisregel no-hardcoded-colour ze in theme.css
 * terugvindt.
 */

import { generatedHeaderLine } from "../lib/header";
import type { Palette } from "./palette";

export function generateTokens(light: Palette): string {
  const pick = (name: string): string => {
    const value = light[name];
    if (value === undefined) throw new Error(`Het palet mist --${name}`);
    return value;
  };

  return [
    generatedHeaderLine("lib/brand/tokens.ts", "tokens") ?? "",
    "",
    "/**",
    " * De enige plek buiten app/theme.css en app/project.css met een kleurwaarde, en alleen voor plekken",
    " * die geen CSS-variabele kunnen lezen: de theme-color van de browser, de foutpagina zonder",
    " * stylesheet, en de opmaak van een mail (die staat als `style` op elk element, want dat is het",
    " * enige dat Outlook, Gmail en een telefoon alle drie hetzelfde doen).",
    " *",
    " * Componenten gebruiken deze waarden niet; zij gebruiken de tokens. `pnpm lint:house` controleert",
    " * dat elke waarde hier ook in theme.css of project.css staat, zodat er geen tweede waarheid ontstaat.",
    " */",
    "export const brandColors = {",
    `  primary: "${pick("primary")}",`,
    `  accent: "${pick("accent")}",`,
    `  surface: "${pick("background")}",`,
    `  ink: "${pick("foreground")}",`,
    "  /** De rail en de tabbalk van de browser: het merk, niet de modus. */",
    `  sidebar: "${pick("sidebar")}",`,
    "  /** Voor mail: zachte tekst, een lijn en het papier. */",
    `  soft: "${pick("muted-foreground")}",`,
    `  line: "${pick("border")}",`,
    `  paper: "${pick("card")}",`,
    "} as const;",
    "",
  ].join("\n");
}
