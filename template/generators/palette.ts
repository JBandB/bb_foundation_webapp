/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Van acht merkkleuren naar twee volledige paletten: licht en donker, elk met alle tokens die
 * app/globals.css kent. Daarna de reparatielus: elk paar uit contrast-pairs.json dat de norm niet
 * haalt, wordt bijgesteld door de voorgrond van de achtergrond af te schuiven, tot alles klopt.
 *
 * **De afleidtabel is bewust eenvoudig.** Een lichtheid per rol, de tint van de merkkleur erbij, en
 * waar het om grijzen gaat een zweem van het merk. Dat levert geen ontwerp van een vormgever op, wel
 * een thema dat in beide modi leesbaar is en herkenbaar in de kleuren van het project; wie meer wil,
 * zet eigen tokens in app/project.css.
 *
 * **De reparatie verandert alleen voorgronden.** Een achtergrond (card, muted, sidebar) draagt
 * meerdere teksten en een verschuiving ervan raakt ze allemaal; een tekstkleur verschuift alleen
 * zichzelf. Haalt het ook dan niet, dan stopt de generator met de paren erbij: dat is een keuze in de
 * configuratie en geen fout om stil te repareren.
 */

import pairs from "./contrast-pairs.json";
import { contrast, ensureContrast, hexToOklch, luminance, oklchToHex, tinted, withLightness } from "./colour";

export interface BrandColours {
  readonly primary: string;
  readonly accent: string;
  readonly surface: string;
  readonly ink: string;
  readonly success: string;
  readonly warning: string;
  readonly danger: string;
  readonly info: string;
}

/** Een palet: tokennaam zonder `--` naar hexwaarde. Alleen kleuren; schaduwen en de overlay staan apart. */
export type Palette = Readonly<Record<string, string>>;

export interface ContrastPair {
  readonly foreground: string;
  readonly background: string;
  readonly minimum: number;
}

export const CONTRAST_PAIRS: readonly ContrastPair[] = pairs.pairs.map(([foreground, background, minimum]) => ({
  foreground: String(foreground),
  background: String(background),
  minimum: Number(minimum),
}));

/** De inkt op de rail en op de primaire knop: constant in beide modi. */
export const ON_DARK = "#ffffff";

/** Een vlak dat tekst draagt moet licht genoeg zijn voor donkere tekst, of donker genoeg voor lichte; de rail is altijd donker. */
const SIDEBAR_MAX_L = 0.3;

function status(hex: string, background: string, card: string): { main: string; bg: string; fg: string } {
  const main = ensureContrast(ensureContrast(hex, background, 4.5) ?? hex, card, 4.5) ?? hex;
  return { main, bg: tinted(hex, 0.94, 0.05), fg: ensureContrast(withLightness(hex, 0.38), tinted(hex, 0.94, 0.05), 4.5) ?? withLightness(hex, 0.3) };
}

function statusDark(hex: string, background: string, card: string): { main: string; bg: string; fg: string } {
  const main = ensureContrast(ensureContrast(withLightness(hex, 0.74), background, 4.5) ?? hex, card, 4.5) ?? withLightness(hex, 0.8);
  const bg = tinted(hex, 0.24, 0.06);
  return { main, bg, fg: ensureContrast(withLightness(hex, 0.86), bg, 4.5) ?? withLightness(hex, 0.9) };
}

export function lightPalette(brand: BrandColours): Palette {
  const background = brand.surface;
  const surfaceL = hexToOklch(brand.surface).l;
  const card = surfaceL >= 0.985 ? tinted(brand.surface, surfaceL - 0.03, 0.01) : "#ffffff";
  const muted = tinted(brand.surface, Math.max(0.5, surfaceL - 0.04), 0.012);
  const secondary = tinted(brand.surface, Math.max(0.5, surfaceL - 0.06), 0.015);
  const secondaryHover = tinted(brand.surface, Math.max(0.5, surfaceL - 0.09), 0.018);

  const primary = ensureContrast(brand.primary, ON_DARK, 4.5) ?? brand.primary;
  const primaryL = hexToOklch(primary).l;
  const accent = ensureContrast(brand.accent, ON_DARK, 4.5) ?? brand.accent;
  const accentQuiet = ensureContrast(ensureContrast(brand.accent, background, 4.5) ?? brand.accent, card, 4.5) ?? accent;

  const success = status(brand.success, background, card);
  const warning = status(brand.warning, background, card);
  const danger = status(brand.danger, background, card);
  const info = status(brand.info, background, card);

  const sidebar = tinted(brand.primary, Math.min(SIDEBAR_MAX_L, 0.27), 0.05);

  return {
    background,
    foreground: brand.ink,
    "foreground-soft": tinted(brand.ink, Math.min(0.45, hexToOklch(brand.ink).l + 0.14), 0.03),
    "muted-foreground": tinted(brand.ink, 0.5, 0.03),
    "subtle-foreground": tinted(brand.ink, 0.62, 0.02),
    card,
    "card-foreground": brand.ink,
    popover: card,
    "popover-foreground": brand.ink,
    muted,
    primary,
    "primary-foreground": ON_DARK,
    "primary-hover": withLightness(primary, Math.max(0.1, primaryL - 0.05)),
    "primary-active": withLightness(primary, Math.max(0.08, primaryL - 0.1)),
    secondary,
    "secondary-foreground": brand.ink,
    "secondary-hover": secondaryHover,
    accent,
    "accent-foreground": ON_DARK,
    "accent-quiet": accentQuiet,
    border: tinted(brand.surface, Math.max(0.4, surfaceL - 0.14), 0.02),
    "border-strong": tinted(brand.ink, 0.6, 0.015),
    input: card,
    ring: primary,
    success: success.main,
    "success-bg": success.bg,
    "success-fg": success.fg,
    warning: warning.main,
    "warning-bg": warning.bg,
    "warning-fg": warning.fg,
    destructive: danger.main,
    "destructive-bg": danger.bg,
    "destructive-foreground": danger.fg,
    info: info.main,
    "info-bg": info.bg,
    "info-fg": info.fg,
    "neutral-bg": muted,
    "neutral-fg": tinted(brand.ink, 0.45, 0.02),
    sidebar,
    "sidebar-foreground": tinted(brand.primary, 0.86, 0.02),
    "sidebar-accent": tinted(brand.primary, 0.34, 0.05),
    "sidebar-accent-foreground": ON_DARK,
    "sidebar-border": tinted(brand.primary, 0.38, 0.04),
    "chart-1": primary,
    "chart-2": accent,
    "chart-3": warning.main,
    "chart-4": tinted(brand.ink, 0.55, 0.01),
    "chart-5": danger.main,
    "chart-6": success.main,
    "chart-grid": secondary,
    "chart-track": muted,
    skeleton: muted,
    "skeleton-sheen": tinted(brand.surface, Math.min(0.99, surfaceL + 0.01), 0.01),
  };
}

export function darkPalette(brand: BrandColours): Palette {
  const base = brand.primary;
  const background = tinted(base, 0.13, 0.012);
  const card = tinted(base, 0.17, 0.014);
  const muted = tinted(base, 0.22, 0.016);
  const secondary = tinted(base, 0.26, 0.018);

  const primary = withLightness(brand.primary, 0.76);
  const accent = withLightness(brand.accent, 0.8);
  const foreground = tinted(brand.ink, 0.95, 0.005);

  const success = statusDark(brand.success, background, card);
  const warning = statusDark(brand.warning, background, card);
  const danger = statusDark(brand.danger, background, card);
  const info = statusDark(brand.info, background, card);

  return {
    background,
    foreground,
    "foreground-soft": tinted(brand.ink, 0.86, 0.008),
    "muted-foreground": tinted(brand.ink, 0.72, 0.012),
    "subtle-foreground": tinted(brand.ink, 0.6, 0.012),
    card,
    "card-foreground": foreground,
    popover: tinted(base, 0.2, 0.014),
    "popover-foreground": foreground,
    muted,
    primary,
    "primary-foreground": tinted(base, 0.14, 0.03),
    "primary-hover": withLightness(brand.primary, 0.81),
    "primary-active": withLightness(brand.primary, 0.7),
    secondary,
    "secondary-foreground": tinted(brand.ink, 0.9, 0.005),
    "secondary-hover": tinted(base, 0.3, 0.02),
    accent,
    "accent-foreground": tinted(base, 0.14, 0.03),
    "accent-quiet": withLightness(brand.accent, 0.76),
    border: tinted(base, 0.28, 0.016),
    "border-strong": tinted(brand.ink, 0.56, 0.012),
    input: tinted(base, 0.15, 0.012),
    ring: primary,
    success: success.main,
    "success-bg": success.bg,
    "success-fg": success.fg,
    warning: warning.main,
    "warning-bg": warning.bg,
    "warning-fg": warning.fg,
    destructive: danger.main,
    "destructive-bg": danger.bg,
    "destructive-foreground": danger.fg,
    info: info.main,
    "info-bg": info.bg,
    "info-fg": info.fg,
    "neutral-bg": muted,
    "neutral-fg": tinted(brand.ink, 0.72, 0.012),
    sidebar: tinted(base, 0.1, 0.012),
    "sidebar-foreground": tinted(brand.primary, 0.86, 0.02),
    "sidebar-accent": tinted(base, 0.17, 0.014),
    "sidebar-accent-foreground": ON_DARK,
    "sidebar-border": tinted(base, 0.22, 0.014),
    "chart-1": primary,
    "chart-2": accent,
    "chart-3": warning.main,
    "chart-4": tinted(brand.ink, 0.72, 0.012),
    "chart-5": danger.main,
    "chart-6": success.main,
    "chart-grid": secondary,
    "chart-track": muted,
    skeleton: muted,
    "skeleton-sheen": tinted(base, 0.28, 0.016),
  };
}

export interface ContrastProblem {
  readonly pair: ContrastPair;
  readonly ratio: number;
}

/** De paren die de norm niet halen in dit palet. `on-dark` is een constante en telt mee. */
export function failingPairs(palette: Palette): ContrastProblem[] {
  const tokens: Record<string, string> = { ...palette, "on-dark": ON_DARK };
  const problems: ContrastProblem[] = [];
  for (const pair of CONTRAST_PAIRS) {
    const foreground = tokens[pair.foreground];
    const background = tokens[pair.background];
    if (foreground === undefined || background === undefined) throw new Error(`Onbekend token in contrast-pairs.json: ${pair.foreground} of ${pair.background}`);
    const ratio = contrast(foreground, background);
    if (ratio < pair.minimum) problems.push({ pair, ratio });
  }
  return problems;
}

/**
 * Stelt voorgronden bij tot elk paar klopt. Hoogstens zes rondes: een token dat als voorgrond én als
 * achtergrond voorkomt kan een ander paar raken, en dan is een tweede ronde nodig. Gooit als het niet
 * lukt, met de paren erbij.
 */
export function repairContrast(palette: Palette, mode: "licht" | "donker"): Palette {
  const current: Record<string, string> = { ...palette };
  for (let round = 0; round < 6; round += 1) {
    const problems = failingPairs(current);
    if (problems.length === 0) return current;
    for (const { pair } of problems) {
      const tokens: Record<string, string> = { ...current, "on-dark": ON_DARK };
      const background = tokens[pair.background] ?? ON_DARK;
      /* De constante is niet te verschuiven, en een vlak dat als voorgrond staat (card op border-strong) verschuiven we via de ander. */
      const target = pair.foreground === "on-dark" || isSurface(pair.foreground) ? pair.background : pair.foreground;
      const other = target === pair.foreground ? background : (tokens[pair.foreground] ?? ON_DARK);
      const fixed = ensureContrast(tokens[target] ?? "#000000", other, pair.minimum);
      if (fixed === undefined) throw contrastError(mode, problems);
      current[target] = fixed;
    }
  }
  const remaining = failingPairs(current);
  if (remaining.length > 0) throw contrastError(mode, remaining);
  return current;
}

/** Vlakken die als voorgrond in een paar staan om hun rand te testen; die verschuiven we niet. */
function isSurface(token: string): boolean {
  return ["card", "background", "sidebar"].includes(token);
}

function contrastError(mode: string, problems: readonly ContrastProblem[]): Error {
  const lines = problems.map(({ pair, ratio }) => `  ${mode}: --${pair.foreground} op --${pair.background} haalt ${ratio.toFixed(2)}:1, minimaal ${pair.minimum}:1`);
  return new Error(
    [
      `Het thema haalt het contrast niet, ook niet na bijstellen (${mode}e modus):`,
      ...lines,
      "Kies in project.config.json een primaire of accentkleur met meer contrast ten opzichte van de achtergrond, of pas surface en ink aan.",
    ].join("\n"),
  );
}

/** Of een kleur licht is, voor keuzes zoals de tekstkleur op een vlak. */
export function isLight(hex: string): boolean {
  return luminance(hex) > 0.18;
}

/** Een lichte grijstint van het merk, voor rgba-achtige doeleinden: de rgb-kanalen van een hex. */
export function rgbChannels(hex: string): string {
  const [r, g, b] = [hex.slice(1, 3), hex.slice(3, 5), hex.slice(5, 7)].map((part) => parseInt(part, 16));
  return `${r}, ${g}, ${b}`;
}

export { oklchToHex };
