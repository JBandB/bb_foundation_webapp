/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import Link from "next/link";
import { labels } from "@/lib/i18n/labels";

/**
 * De keten naar boven, als eyebrow in de kop.
 *
 * De laatste kruimel is geen link: dat is de pagina waar je staat. Naast de terugpijl en niet in
 * plaats daarvan: de pijl is één klik omhoog, de keten laat zien wáár je bent en kan twee niveaus in
 * één keer terug. Twee verschillende vragen, twee verschillende dingen.
 */

export interface Crumb {
  /** Leeg voor de plek waar je nu bent. */
  readonly href?: string;
  readonly label: string;
}

export function Breadcrumb({ items }: { items: readonly Crumb[] }) {
  if (items.length === 0) return null;

  return (
    <nav aria-label={labels.ui.breadcrumb}>
      <ol className="flex flex-wrap items-center gap-x-1.5">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-x-1.5">
            {index > 0 && (
              <span aria-hidden="true" className="text-subtle-foreground">
                ·
              </span>
            )}
            {item.href === undefined ? (
              <span>{item.label}</span>
            ) : (
              <Link href={item.href} className="hover:text-accent-quiet">
                {item.label}
              </Link>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
