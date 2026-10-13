/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Sorteren via de URL: `?sort=deadline&dir=desc`.
 *
 * **De sortering staat in de URL en niet in de browser.** Daarmee is een gesorteerd overzicht te
 * delen, werkt de terugknop, en blijft de pagina een servercomponent zonder een kilobyte JavaScript.
 *
 * **Wat er niet door de controle komt, valt terug op de standaard.** Een sleutel uit een URL is
 * invoer van buiten: `?sort=salaris` hoort geen query te bereiken en geen foutpagina op te leveren,
 * maar het overzicht dat je zonder parameter ook had gekregen. Vandaar de whitelist per scherm.
 *
 * Puur, dus getest. Zie `sort.test.ts`.
 */

import { PROJECT } from "@/lib/project/config.generated";

export type SortDirection = "asc" | "desc";

export interface SortState<Key extends string> {
  /** Waarop er wordt gesorteerd, of `undefined` voor de eigen volgorde van het scherm. */
  readonly key: Key | undefined;
  readonly direction: SortDirection;
}

/** De gekozen sortering, of niets. `allowed` is de lijst kolommen waarop dit scherm mag sorteren. */
export function sortFrom<Key extends string>(params: { sort?: string; dir?: string }, allowed: readonly Key[]): SortState<Key> {
  const key = allowed.find((option) => option === params.sort);
  return { key, direction: params.dir === "desc" ? "desc" : "asc" };
}

/**
 * Waar de link van een kolomkop heen gaat. Klikken op de kolom waarop al gesorteerd wordt, draait de
 * richting om; klikken op een andere kolom begint oplopend. De overige parameters blijven staan.
 */
export function sortHref(path: string, params: Record<string, string | undefined>, key: string, current: SortState<string>): string {
  const next = new URLSearchParams();

  for (const [name, value] of Object.entries(params)) {
    if (value === undefined || value === "") continue;
    if (name === "sort" || name === "dir") continue;
    next.set(name, value);
  }

  next.set("sort", key);
  if (current.key === key && current.direction === "asc") next.set("dir", "desc");

  return `${path}?${next.toString()}`;
}

/** Wat `aria-sort` op de kolomkop moet zeggen. */
export function ariaSort(key: string, current: SortState<string>): "ascending" | "descending" | "none" {
  if (current.key !== key) return "none";
  return current.direction === "asc" ? "ascending" : "descending";
}

/**
 * Een vergelijkfunctie voor tekst en getallen, met de richting erin.
 *
 * Tekst vergelijkt met `localeCompare` in de locale van het project. Lege waarden gaan altijd
 * achteraan, ongeacht de richting: iets zonder datum hoort niet bovenaan te staan omdat het niets is.
 */
export function compareBy<Row>(rows: readonly Row[], value: (row: Row) => string | number | bigint | null | undefined, direction: SortDirection): Row[] {
  const factor = direction === "desc" ? -1 : 1;

  return [...rows].sort((left, right) => {
    const a = value(left);
    const b = value(right);

    const aEmpty = a === null || a === undefined;
    const bEmpty = b === null || b === undefined;
    if (aEmpty && bEmpty) return 0;
    if (aEmpty) return 1;
    if (bEmpty) return -1;

    if (typeof a === "string" || typeof b === "string") return String(a).localeCompare(String(b), PROJECT.locale) * factor;

    /* Bedragen zijn `bigint` en aantallen `number`. Aftrekken kan niet over die grens heen. */
    if (a === b) return 0;
    return (a < b ? -1 : 1) * factor;
  });
}
