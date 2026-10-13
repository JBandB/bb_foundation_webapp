/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { isIsoDate } from "@/lib/domain/dates";
import { labels } from "@/lib/i18n/labels";
import { buttonClass } from "./button";
import { controlClass } from "./field";

/**
 * Van welke datum tot welke datum.
 *
 * **Een gewoon `GET`-formulier en geen server action.** De periode hoort in de URL: dan is een
 * overzicht te delen, werkt de terugknop, en kun je een tabblad openhouden op het vorige kwartaal. Er
 * valt niets te bewaren en niets te versturen, dus het is ook geen clientcomponent.
 */
export function PeriodForm({
  from,
  to,
  action,
  submitLabel = labels.ui.apply,
  extra,
}: {
  from: string;
  to: string;
  /** Waar het formulier heen gaat. Leeg is dezelfde pagina. */
  action?: string;
  submitLabel?: string;
  /** Extra velden in hetzelfde formulier, want een GET-formulier stuurt alleen zijn eigen velden mee. */
  extra?: React.ReactNode;
}) {
  return (
    <form method="get" {...(action === undefined ? {} : { action })} className="flex flex-wrap items-end gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold">{labels.ui.from}</span>
        <input type="date" name="from" defaultValue={from} className={controlClass} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[11px] font-semibold">{labels.ui.until}</span>
        <input type="date" name="to" defaultValue={to} className={controlClass} />
      </label>
      {extra}

      <button type="submit" className={buttonClass("secondary")}>
        {submitLabel}
      </button>
    </form>
  );
}

/**
 * De gekozen periode, of het jaar tot vandaag.
 *
 * Wat er niet door de controle komt, valt terug op de standaard. Een datum uit een URL is invoer van
 * buiten: `?from=gisteren` hoort geen query te bereiken en geen foutpagina op te leveren.
 */
export function periodFrom(params: { from?: string; to?: string }, today: string): { from: string; to: string } {
  const yearStart = `${today.slice(0, 4)}-01-01`;

  const from = isIsoDate(params.from ?? "") ? (params.from ?? yearStart) : yearStart;
  const to = isIsoDate(params.to ?? "") ? (params.to ?? today) : today;

  /* Omgekeerd ingevuld levert een lege periode op, en dat leest als "er is niets gebeurd". */
  return from <= to ? { from, to } : { from: to, to: from };
}
