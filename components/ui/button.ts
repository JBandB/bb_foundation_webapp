/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De knopstijlen, als functie en niet als component.
 *
 * Een knop is soms een `<button>` en soms een `<Link>`, en die twee kunnen niet dezelfde component
 * zijn zonder een `as`-prop die het type kapot maakt. Een functie die klassen teruggeeft werkt voor
 * allebei, is te gebruiken in een servercomponent, en kost geen JavaScript in de browser.
 *
 * Klikfeedback is meer dan een hover: `hover:` voor de muis, `active:` voor het indrukken (de knop
 * zakt een pixel; de enige terugkoppeling die op een aanraakscherm werkt), `focus-visible` globaal
 * in globals.css, en een bezige toestand tijdens een server action in submit-button.tsx.
 */

export type ButtonVariant = "primary" | "secondary" | "outline" | "quiet" | "danger" | "bare";

const SHARED = [
  "inline-flex items-center gap-2 whitespace-nowrap",
  "cursor-pointer select-none",
  "transition-[background-color,color,border-color,translate] duration-100",
  "active:translate-y-px",
  "disabled:cursor-not-allowed disabled:opacity-45 disabled:active:translate-y-0",
].join(" ");

/** 36 pixels hoog, zie docs/THEME.md. */
const BASE = ["justify-center", "font-display h-9 rounded-md px-3.5 text-[13px] font-medium"].join(" ");

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-primary text-primary-foreground border border-primary hover:bg-primary-hover hover:border-primary-hover active:bg-primary-active",
  secondary: "bg-secondary text-secondary-foreground border border-transparent hover:bg-secondary-hover",
  outline: "bg-transparent text-foreground border border-border-strong hover:bg-secondary hover:border-border-strong",
  quiet: "bg-transparent text-foreground-soft hover:text-foreground hover:bg-secondary",
  danger: "bg-transparent text-destructive border border-transparent hover:bg-destructive hover:text-on-dark",
  /* Geen knopvorm: voor een verzendknop die naast gewone tekst op dezelfde linkerlijn moet beginnen, zoals in de rail. */
  bare: "bg-transparent",
};

export function buttonClass(variant: ButtonVariant = "secondary", extra = ""): string {
  const shape = variant === "bare" ? "" : BASE;
  return [SHARED, shape, VARIANTS[variant], extra].filter((part) => part !== "").join(" ");
}
