/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Kleurrekenwerk zonder afhankelijkheden: hex, sRGB, OKLab/OKLCH en het WCAG-contrast.
 *
 * **Waarom OKLCH.** Een thema afleiden uit twee merkkleuren betekent: lichter en donkerder maken met
 * behoud van de tint. In RGB of HSL verschuift de waargenomen helderheid per tint (een geel van 50%
 * lichtheid is veel lichter dan een blauw van 50%). OKLCH is gemaakt zodat gelijke L gelijk licht
 * oogt, en dat is precies wat een contrastregel nodig heeft: de L van een tekstkleur verschuiven tot
 * de verhouding klopt, zonder dat de kleur van karakter verandert.
 *
 * **Het contrast is dezelfde formule als in scripts/check-contrast.mjs**, tot en met de drempel van
 * de linearisatie, zodat de generator en de controle nooit over een andere waarde praten.
 */

export interface Oklch {
  /** Lichtheid, 0 tot 1. */
  readonly l: number;
  /** Chroma, 0 is grijs; in de praktijk tot ongeveer 0,37. */
  readonly c: number;
  /** Tint in graden, 0 tot 360. */
  readonly h: number;
}

export function parseHex(hex: string): [number, number, number] {
  const full = hex.length === 4 ? `#${hex[1]}${hex[1]}${hex[2]}${hex[2]}${hex[3]}${hex[3]}` : hex;
  if (!/^#[0-9a-fA-F]{6}$/.test(full)) throw new Error(`Geen hexkleur: ${hex}`);
  return [parseInt(full.slice(1, 3), 16) / 255, parseInt(full.slice(3, 5), 16) / 255, parseInt(full.slice(5, 7), 16) / 255];
}

export function toHex(rgb: readonly [number, number, number]): string {
  const channel = (value: number): string =>
    Math.round(Math.min(1, Math.max(0, value)) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${channel(rgb[0])}${channel(rgb[1])}${channel(rgb[2])}`;
}

function toLinear(value: number): number {
  return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
}

function fromLinear(value: number): number {
  return value <= 0.0031308 ? 12.92 * value : 1.055 * value ** (1 / 2.4) - 0.055;
}

export function hexToOklch(hex: string): Oklch {
  const [r, g, b] = parseHex(hex).map(toLinear) as [number, number, number];
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  const c = Math.sqrt(A * A + B * B);
  const h = c < 1e-6 ? 0 : ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
  return { l: L, c, h };
}

function oklchToLinearRgb({ l, c, h }: Oklch): [number, number, number] {
  const a = c * Math.cos((h * Math.PI) / 180);
  const b = c * Math.sin((h * Math.PI) / 180);
  const l_ = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m_ = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s_ = (l - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l_ - 3.3077115913 * m_ + 0.2309699292 * s_,
    -1.2684380046 * l_ + 2.6097574011 * m_ - 0.3413193965 * s_,
    -0.0041960863 * l_ - 0.7034186147 * m_ + 1.707614701 * s_,
  ];
}

function inGamut(rgb: readonly [number, number, number]): boolean {
  return rgb.every((value) => value >= -0.0005 && value <= 1.0005);
}

/**
 * Naar hex, met gamut-mapping: een kleur die sRGB niet kan tonen krijgt minder chroma tot hij past,
 * met dezelfde lichtheid en tint. Clippen per kanaal zou de tint verschuiven.
 */
export function oklchToHex(colour: Oklch): string {
  const l = Math.min(1, Math.max(0, colour.l));
  let low = 0;
  let high = Math.max(0, colour.c);
  let linear = oklchToLinearRgb({ l, c: high, h: colour.h });
  if (!inGamut(linear)) {
    for (let step = 0; step < 24; step += 1) {
      const mid = (low + high) / 2;
      const candidate = oklchToLinearRgb({ l, c: mid, h: colour.h });
      if (inGamut(candidate)) low = mid;
      else high = mid;
    }
    linear = oklchToLinearRgb({ l, c: low, h: colour.h });
  }
  return toHex(linear.map(fromLinear) as [number, number, number]);
}

/** Dezelfde lichtheid als WCAG rekent, met dezelfde drempel als scripts/check-contrast.mjs. */
export function luminance(hex: string): number {
  const [r, g, b] = parseHex(hex).map((value) => (value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4)) as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** De contrastverhouding, 1 tot 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number];
  return (hi + 0.05) / (lo + 0.05);
}

/** Dezelfde tint en chroma, een andere lichtheid. */
export function withLightness(hex: string, l: number, chroma?: number): string {
  const colour = hexToOklch(hex);
  return oklchToHex({ l, c: chroma ?? colour.c, h: colour.h });
}

/** Dezelfde tint, een andere lichtheid en een plafond op de chroma: voor grijzen met een zweem van het merk. */
export function tinted(hex: string, l: number, maxChroma: number): string {
  const colour = hexToOklch(hex);
  return oklchToHex({ l, c: Math.min(colour.c, maxChroma), h: colour.h });
}

/**
 * Schuift de lichtheid van `foreground` van `background` af tot het contrast de norm haalt. Bij een
 * lichte achtergrond wordt de voorgrond donkerder, bij een donkere lichter. Geeft undefined als het
 * ook helemaal zwart of wit niet haalt (dan is de achtergrond het probleem).
 */
export function ensureContrast(foreground: string, background: string, minimum: number): string | undefined {
  if (contrast(foreground, background) >= minimum) return foreground;
  const darken = luminance(background) > 0.18;
  const start = hexToOklch(foreground);
  for (let step = 1; step <= 100; step += 1) {
    const l = darken ? start.l - step * 0.01 : start.l + step * 0.01;
    if (l < 0 || l > 1) break;
    const candidate = oklchToHex({ l, c: start.c, h: start.h });
    if (contrast(candidate, background) >= minimum) return candidate;
  }
  return undefined;
}
