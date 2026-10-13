/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Schrijft app/theme.css uit de huisstijl in project.config.json: de constanten, het lichte palet en
 * het donkere palet, in de drie blokken die scripts/check-contrast.mjs leest. Alleen contractnamen
 * (het shadcn-vocabulaire plus de uitbreidingen uit app/globals.css), nooit merknamen.
 */

import type { ProjectConfig } from "../lib/config-schema";
import { generatedHeaderLine } from "../lib/header";
import { darkPalette, lightPalette, repairContrast, rgbChannels, type Palette } from "./palette";

const RADII: Record<ProjectConfig["brand"]["radius"], { base: number; tight: number; card: number }> = {
  sharp: { base: 4, tight: 2, card: 8 },
  soft: { base: 8, tight: 4, card: 12 },
  round: { base: 12, tight: 6, card: 16 },
};

/** De volgorde waarin de tokens in het bestand staan, zodat een diff leesbaar blijft. */
const ORDER = [
  "background",
  "foreground",
  "foreground-soft",
  "muted-foreground",
  "subtle-foreground",
  "card",
  "card-foreground",
  "popover",
  "popover-foreground",
  "muted",
  "primary",
  "primary-foreground",
  "primary-hover",
  "primary-active",
  "secondary",
  "secondary-foreground",
  "secondary-hover",
  "accent",
  "accent-foreground",
  "accent-quiet",
  "border",
  "border-strong",
  "input",
  "ring",
  "success",
  "success-bg",
  "success-fg",
  "warning",
  "warning-bg",
  "warning-fg",
  "destructive",
  "destructive-bg",
  "destructive-foreground",
  "info",
  "info-bg",
  "info-fg",
  "neutral-bg",
  "neutral-fg",
  "sidebar",
  "sidebar-foreground",
  "sidebar-accent",
  "sidebar-accent-foreground",
  "sidebar-border",
  "chart-1",
  "chart-2",
  "chart-3",
  "chart-4",
  "chart-5",
  "chart-6",
  "chart-grid",
  "chart-track",
  "skeleton",
  "skeleton-sheen",
] as const;

function tokenLines(palette: Palette): string[] {
  const lines: string[] = [];
  for (const name of ORDER) {
    const value = palette[name];
    if (value === undefined) throw new Error(`Het palet mist --${name}`);
    lines.push(`  --${name}: ${value};`);
  }
  const missing = Object.keys(palette).filter((name) => !(ORDER as readonly string[]).includes(name));
  if (missing.length > 0) throw new Error(`Het palet heeft tokens die globals.css niet kent: ${missing.join(", ")}`);
  return lines;
}

export interface ThemeOutput {
  readonly css: string;
  readonly light: Palette;
  /** Leeg als de donkere modus uit staat. */
  readonly dark: Palette | undefined;
}

export function generateTheme(config: ProjectConfig): ThemeOutput {
  const light = repairContrast(lightPalette(config.brand.colours), "licht");
  const dark = config.brand.darkMode === "off" ? undefined : repairContrast(darkPalette(config.brand.colours), "donker");
  const radius = RADII[config.brand.radius];
  const ink = rgbChannels(light.foreground ?? "#000000");

  const lines = [
    generatedHeaderLine("app/theme.css", "theme") ?? "",
    "",
    "/* ---------- 1. Constanten, nooit modusafhankelijk ------------ */",
    ":root {",
    "  /* Inkt op een vlak dat in beide modi donker is: de rail, de primaire knop op licht. */",
    "  --on-dark: #ffffff;",
    "",
    "  --font-display: var(--font-space-grotesk), system-ui, sans-serif;",
    "  --font-sans: var(--font-manrope), system-ui, sans-serif;",
    '  --font-mono: var(--font-jetbrains-mono), ui-monospace, "SFMono-Regular", monospace;',
    "",
    `  --radius: ${radius.base}px;`,
    `  --radius-tight: ${radius.tight}px;`,
    `  --radius-card: ${radius.card}px;`,
    "",
    "  --ring-width: 2px;",
    "  --dur-fast: 120ms;",
    "  --dur-base: 180ms;",
    "  --ease: cubic-bezier(0.2, 0, 0, 1);",
    "}",
    "",
    "/* ---------- 2. Licht, de standaard ---------------------------- */",
    ":root,",
    ".light {",
    "  /* Ook op een geneste .light, zodat een deel van een pagina licht kan blijven. */",
    "  color-scheme: light;",
    "",
    ...tokenLines(light),
    "",
    `  --shadow-float: 0 4px 14px rgba(${ink}, 0.1);`,
    `  --shadow-panel: 0 18px 48px rgba(${ink}, 0.16);`,
    `  --overlay: rgba(${ink}, 0.38);`,
    "}",
    "",
  ];

  if (dark === undefined) {
    lines.push("/* ---------- 3. Donker, uit in project.config.json ------------- */", "/* dark mode: off */", "");
  } else {
    lines.push(
      "/* ---------- 3. Donker, een keuze per gebruiker ---------------- */",
      ".dark {",
      "  color-scheme: dark;",
      "",
      ...tokenLines(dark),
      "",
      "  --shadow-float: 0 4px 14px rgba(0, 0, 0, 0.45);",
      "  --shadow-panel: 0 18px 48px rgba(0, 0, 0, 0.55);",
      "  --overlay: rgba(0, 0, 0, 0.66);",
      "}",
      "",
    );
  }

  return { css: lines.join("\n"), light, dark };
}
