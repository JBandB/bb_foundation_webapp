/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Een statuschip: een korte stand in een pil, met een kleur die iets betekent. De pilvorm is
 * voorbehouden aan chips, avatars en het schuifje (docs/THEME.md).
 *
 * De toon is een betekenis en geen kleur: `success` is gelukt of actief, `warning` is wachten of let
 * op, `danger` is fout of geweigerd, `info` is een neutrale mededeling, `accent` is "nu of actief".
 */
export type ChipTone = "neutral" | "success" | "warning" | "danger" | "info" | "accent";

const TONES: Record<ChipTone, string> = {
  neutral: "bg-neutral-bg text-neutral-fg",
  success: "bg-success-bg text-success-fg",
  warning: "bg-warning-bg text-warning-fg",
  danger: "bg-destructive-bg text-destructive-foreground",
  info: "bg-info-bg text-info-fg",
  accent: "bg-accent text-accent-foreground",
};

export function Chip({ tone = "neutral", children, title }: { tone?: ChipTone; children: React.ReactNode; title?: string }) {
  return (
    <span title={title} className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${TONES[tone]}`}>
      {children}
    </span>
  );
}
