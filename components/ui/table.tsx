/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import Link from "next/link";
import { ariaSort, type SortState } from "./sort";

/**
 * De tabelopmaak, één keer.
 *
 * Getallen staan rechts en tekst links. Dat is geen smaak: een kolom bedragen die links staat is niet
 * te vergelijken zonder hem uit te rekenen, en daarom staat `num` er ook meteen op.
 *
 * De maatvoering komt uit docs/THEME.md: rijen van 44 pixels, geen verticale lijnen, een kopregel in
 * gedempte kapitalen op `--muted` met de zwaardere lijn eronder, en een rij die bij hover licht
 * opkleurt.
 *
 * **Sorteren zit in de kop.** Een `Th` met een `sort`-prop wordt een link met `aria-sort`; de
 * sortering staat in de URL en de pagina doet het ordenen. Zo blijft een tabel een servercomponent en
 * gaat er geen JavaScript naar de browser voor iets wat een link ook kan. Zie `sort.ts`.
 */

export function DataTable({ children, minWidth }: { children: React.ReactNode; minWidth?: number }) {
  return (
    <div className="border-border rounded-lg bg-card overflow-x-auto border">
      <table className="w-full border-collapse text-[13px]" style={minWidth === undefined ? undefined : { minWidth: `${minWidth}px` }}>
        {children}
      </table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead>
      <tr className="border-border-strong bg-muted border-b text-left">{children}</tr>
    </thead>
  );
}

export function Th({
  children,
  align = "left",
  sort,
  hint,
}: {
  children?: React.ReactNode;
  align?: "left" | "right";
  /** Een uitleg naast de kolomnaam. Naast de link en niet erin: een knop in een link is ongeldige HTML. */
  hint?: React.ReactNode;
  /** Maakt van deze kop een sorteerlink. `href` komt uit `sortHref` en `state` uit `sortFrom`. */
  sort?: { href: string; key: string; state: SortState<string> };
}) {
  const head = "overline text-muted-foreground px-3 py-2.5 whitespace-nowrap";

  if (sort === undefined) {
    return (
      <th className={`${head} ${align === "right" ? "text-right" : ""}`} scope="col">
        {children}
        {hint !== undefined && <span className="ml-1 align-middle">{hint}</span>}
      </th>
    );
  }

  const active = sort.state.key === sort.key;

  return (
    <th className={`${head} ${align === "right" ? "text-right" : ""}`} scope="col" aria-sort={ariaSort(sort.key, sort.state)}>
      <Link href={sort.href} className={`hover:text-foreground inline-flex items-center gap-1 transition-colors duration-100 ${active ? "text-foreground" : ""}`}>
        {children}
        {/* Het pijltje staat er alleen op de kolom waarop gesorteerd wordt. */}
        {active && (
          <span aria-hidden="true" className="text-accent-quiet">
            {sort.state.direction === "asc" ? "↑" : "↓"}
          </span>
        )}
      </Link>
      {hint !== undefined && <span className="ml-1 align-middle">{hint}</span>}
    </th>
  );
}

export function Tr({ children }: { children: React.ReactNode }) {
  return <tr className="border-border hover:bg-secondary border-b transition-colors duration-100 last:border-0">{children}</tr>;
}

export function Td({ children, align = "left" }: { children: React.ReactNode; align?: "left" | "right" }) {
  return <td className={`px-3 py-3 ${align === "right" ? "num text-right" : ""}`}>{children}</td>;
}

/** Een rij die zegt dat er niets is, over de volle breedte. */
export function EmptyRow({ columns, children }: { columns: number; children: string }) {
  return (
    <tr>
      <td colSpan={columns} className="text-muted-foreground px-3 py-6 text-center">
        {children}
      </td>
    </tr>
  );
}
