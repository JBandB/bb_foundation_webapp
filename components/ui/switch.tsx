/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het schuifje. Zie docs/THEME.md.
 *
 * Een aankruisvakje zegt niet of het aan of uit staat zonder dat je het label leest, en een knop die
 * "Weekend uit" heet zegt wat er gebeurt als je hem indrukt, niet wat de stand is. Een schuifje toont
 * de stand zelf.
 *
 * **Twee vormen, één beeld.** `SwitchField` en `SwitchLabel` zijn een `<input type="checkbox">` die
 * met het formulier meegaat; `SwitchSubmit` is een knop die meteen iets doet. Dat verschil is echt en
 * hoort te verschillen in gedrag en niet in uiterlijk.
 *
 * **Geen JavaScript.** Het vakje blijft een echt vakje en de baan reageert erop via
 * `group-has-[:checked]`. Het vakje ligt doorzichtig over het hele label in plaats van `sr-only`,
 * zodat het aanklikbaar is op de plek waar je het ziet; ook voor Playwright.
 */

const TRACK = ["pointer-events-none relative inline-flex h-5 w-[34px] flex-none items-center rounded-full", "transition-colors duration-100"].join(" ");
const THUMB = ["pointer-events-none absolute top-[2px] left-[2px] size-4 rounded-full", "transition-transform duration-100"].join(" ");

const TRACK_FROM_INPUT = [
  TRACK,
  "bg-border-strong group-has-[:checked]:bg-accent-quiet",
  "group-has-[:focus-visible]:outline-ring group-has-[:focus-visible]:outline-2 group-has-[:focus-visible]:outline-offset-2",
].join(" ");

const THUMB_FROM_INPUT = [THUMB, "bg-card group-has-[:checked]:translate-x-[14px]"].join(" ");

/** Doorzichtig, over het hele label heen. `appearance-none` haalt de eigen tekening van de browser weg. */
const INPUT = "absolute inset-0 size-full cursor-pointer appearance-none opacity-0 m-0";

function TrackFromInput() {
  return (
    <span aria-hidden="true" className={TRACK_FROM_INPUT}>
      <span className={THUMB_FROM_INPUT} />
    </span>
  );
}

/** Een schuifje in een veldenrij, met zijn label ernaast. Beslaat dezelfde drie rijen als een gewoon veld. */
export function SwitchField({ name, label, hint, defaultChecked = false }: { name: string; label: string; hint?: string; defaultChecked?: boolean }) {
  return (
    <label className="group relative row-span-3 grid cursor-pointer grid-rows-subgrid gap-1">
      <span aria-hidden="true" />
      <span className="flex h-9 items-center gap-2.5 text-[13px]">
        <input type="checkbox" name={name} defaultChecked={defaultChecked} className={INPUT} />
        <TrackFromInput />
        {label}
      </span>
      <span className="text-muted-foreground text-[11px] leading-snug">{hint ?? ""}</span>
    </label>
  );
}

/** Hetzelfde schuifje, los van de veldenrij: label ernaast en verder niets eromheen. */
export function SwitchLabel({ name, label, value, defaultChecked = false }: { name: string; label: string; value?: string; defaultChecked?: boolean }) {
  return (
    <label className="group relative flex cursor-pointer items-center gap-2.5 text-[13px]">
      <input type="checkbox" name={name} value={value} defaultChecked={defaultChecked} className={INPUT} />
      <TrackFromInput />
      {label}
    </label>
  );
}

/**
 * Waar het schuifje op staat, want dat bepaalt zijn kleuren. `page` is het gewone geval; `rail` is de
 * navigatierail, die in beide modi donker is.
 */
export type SwitchTone = "page" | "rail";

const TONES: Record<SwitchTone, { on: string; off: string; thumb: string; label: string }> = {
  page: { on: "bg-accent-quiet", off: "bg-border-strong", thumb: "bg-card", label: "text-foreground-soft hover:text-foreground" },
  rail: { on: "bg-on-dark", off: "bg-on-dark/45", thumb: "bg-sidebar", label: "text-on-dark/70 hover:text-on-dark" },
};

/**
 * Een schuifje dat meteen iets doet: een verzendknop in de vorm van een schuifje. Hoort in een
 * `<form action={...}>`. De stand komt als prop binnen, want `aria-checked` is de enige manier waarop
 * een schermlezer weet of hij aan of uit staat, en dat kan een stylesheet niet weten.
 */
export function SwitchSubmit({
  checked,
  label,
  title,
  tone = "page",
  labelHidden = false,
}: {
  checked: boolean;
  label: string;
  title?: string;
  tone?: SwitchTone;
  labelHidden?: boolean;
}) {
  const colours = TONES[tone];

  return (
    <button type="submit" role="switch" aria-checked={checked} title={title ?? label} className={`${colours.label} flex cursor-pointer items-center gap-2.5 text-[13px] active:translate-y-px`}>
      <span aria-hidden="true" className={`${TRACK} ${checked ? colours.on : colours.off}`}>
        <span className={`${THUMB} ${colours.thumb} ${checked ? "translate-x-[14px]" : ""}`} />
      </span>
      <span className={labelHidden ? "sr-only" : ""}>{label}</span>
    </button>
  );
}
