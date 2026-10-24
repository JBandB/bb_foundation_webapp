/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Geld bij AI: prijzen per miljoen tokens, in centen, en de kosten van een verzoek.
 *
 * Een prijs is een bedrag in centen plus een valuta (CLAUDE.md regel 15). De prijspagina van
 * Anthropic noemt dollars per miljoen tokens met hoogstens twee decimalen; een beheerder typt ze zo
 * over, en `parsePrice` maakt er hele centen van. De kosten van één verzoek zijn tokens maal prijs
 * gedeeld door een miljoen: een fractie van een cent. Die rekenen we exact als "centtokens" (een
 * geheel getal) en ronden pas af bij het tonen, één keer.
 */

export const DEFAULT_CURRENCY = "USD";
const TOKENS_PER_PRICE_UNIT = 1_000_000;

export type PriceParse = { readonly ok: true; readonly cents: number } | { readonly ok: false; readonly reason: "empty" | "format" | "tooLarge" };

/** "0,10", "0.10", "4" of "$ 2,50" naar centen. Hoogstens twee decimalen, nooit negatief. */
export function parsePrice(input: string): PriceParse {
  const text = input.trim().replace(/^\$\s*/, "").replace(/\s/g, "");
  if (text === "") return { ok: false, reason: "empty" };
  const match = /^(\d{1,6})(?:[.,](\d{1,2}))?$/.exec(text);
  if (match === null) return { ok: false, reason: "format" };
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "").padEnd(2, "0"));
  const cents = whole * 100 + fraction;
  if (cents > 10_000_000) return { ok: false, reason: "tooLarge" };
  return { ok: true, cents };
}

/** Centen naar wat een beheerder typte, zonder valutateken: 10 wordt "0.10". */
export function priceInput(cents: number): string {
  return `${Math.floor(cents / 100)}.${String(cents % 100).padStart(2, "0")}`;
}

export interface PricedUsage {
  readonly inputTokens: number;
  readonly outputTokens: number;
  readonly inputCentsPerMtok: number | null;
  readonly outputCentsPerMtok: number | null;
}

/**
 * De kosten in centtokens: centen maal tokens, exact als geheel getal. Null als er geen prijs was.
 * Delen door een miljoen geeft centen; dat doet pas `formatCost`.
 */
export function centTokens(usage: PricedUsage): number | null {
  if (usage.inputCentsPerMtok === null || usage.outputCentsPerMtok === null) return null;
  return usage.inputTokens * usage.inputCentsPerMtok + usage.outputTokens * usage.outputCentsPerMtok;
}

/** Centtokens naar een bedrag in de valuta, één keer afgerond: op de cent als het boven de euro of dollar uitkomt, anders op vier decimalen. */
export function formatCost(centTokenTotal: number, currency: string, locale: string): string {
  const units = centTokenTotal / TOKENS_PER_PRICE_UNIT / 100;
  const digits = units >= 1 ? 2 : 4;
  return new Intl.NumberFormat(locale, { style: "currency", currency, minimumFractionDigits: 2, maximumFractionDigits: digits }).format(units);
}
