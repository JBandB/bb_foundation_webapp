/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { labels } from "@/lib/i18n/labels";

/**
 * De tweede menubalk, boven de paginatitel. Zie CLAUDE.md regel 9: meer dan drie onderwerpen splitst
 * in tabbladen met echte routes.
 *
 * **Echte routes en geen tabbladen met JavaScript.** Een tabblad is dan een deelbare link, en elke
 * pagina doet alleen zijn eigen query's.
 *
 * **Het actieve item op exacte overeenkomst en niet op voorvoegsel**, anders licht het eerste item
 * ook op als je op een dieper pad staat. Dat is het omgekeerde van de rail links, en met opzet: daar
 * is het voorvoegsel de bedoeling.
 */

export interface SubNavItem {
  readonly href: string;
  readonly label: string;
}

export function SubNav({ items }: { items: readonly SubNavItem[] }) {
  const pathname = usePathname();

  if (items.length === 0) return null;

  return (
    <nav aria-label={labels.ui.topics} className="border-border bg-card border-b px-6 max-md:px-4">
      <ul className="-mb-px flex flex-wrap gap-x-1">
        {items.map((item) => {
          const active = pathname === item.href;

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={[
                  "inline-block border-b-2 px-3 py-2.5 text-[13px] whitespace-nowrap",
                  "transition-colors duration-100 active:translate-y-px",
                  active ? "border-b-accent text-foreground font-semibold" : "text-muted-foreground hover:text-foreground border-transparent",
                ].join(" ")}
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
