/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Mark } from "@/components/brand/mark";
import { labels } from "@/lib/i18n/labels";
import { APP_VERSION } from "@/lib/version";

/**
 * De navigatierail. Zie docs/THEME.md.
 *
 * Deze component bepaalt niet wat je mag zien. De items komen als prop uit de server, die ze met
 * `can()` heeft gefilterd. Wie iets niet mag, krijgt het item niet binnen, in plaats van dat het met
 * CSS verborgen wordt.
 *
 * **Eén niveau, en verder niets.** Een rail is een lijst met plekken waar je heen kunt, geen
 * inhoudsopgave. Wat er ónder een bestemming hangt, hoort op die bestemming zelf te staan, als
 * tabbladen (`SubNav`).
 */

export interface NavItem {
  readonly href: string;
  readonly label: string;
  readonly badge?: string;
  /** Andere paden die onder deze bestemming vallen, zodat het item ook daar oplicht. */
  readonly also?: readonly string[];
  /** Een bestemming die er nog niet is: geen link maar een gedempte regel. */
  readonly disabled?: boolean;
}

interface Props {
  items: readonly NavItem[];
  user: { name: string; initials: string; roleLabel: string };
  /** De uitlogknop, aangeleverd door de server: deze component is een clientcomponent en kan zelf geen server action aanroepen. */
  signOut: React.ReactNode;
  /** Licht of donker, om dezelfde reden als node aangeleverd. */
  themeToggle: React.ReactNode;
}

/** Op voorvoegsel, zodat een detailscherm zijn bestemming laat oplichten. */
function isActive(pathname: string, item: NavItem): boolean {
  const paths = [item.href, ...(item.also ?? [])];
  return paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
}

export function NavRail({ items, user, signOut, themeToggle }: Props) {
  const pathname = usePathname();

  return (
    <aside
      /* De rail blijft staan terwijl de pagina scrollt, zodat het blok onderin (uitloggen, modus, versie) in beeld blijft. Op mobiel een horizontale balk bovenaan. */
      className="bg-sidebar text-on-dark flex flex-col py-[22px] md:sticky md:top-0 md:h-dvh md:overflow-y-auto max-md:flex-row max-md:items-center max-md:gap-1.5 max-md:overflow-x-auto max-md:px-3.5 max-md:py-3"
    >
      {/* Het merk is de home-knop: `/` stuurt door naar het beginscherm. */}
      <div className="flex px-6 pb-7 max-md:pr-3.5 max-md:pb-0 max-md:pl-0">
        <Link href="/" aria-label={labels.nav.home} title={labels.nav.home} className="rounded-md inline-block cursor-pointer transition-opacity duration-100 hover:opacity-75 active:translate-y-px">
          <Mark tone="on-dark" className="text-[24px] max-md:text-[19px]" />
        </Link>
      </div>

      <nav className="flex flex-col gap-0.5 max-md:flex-row max-md:gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item);

          if (item.disabled === true) {
            return (
              <span
                key={item.href}
                aria-disabled="true"
                className={[
                  "flex items-center gap-2.5 border-l-[3px] border-transparent py-2.5 pr-5 pl-[21px] text-[14px] whitespace-nowrap",
                  "max-md:border-l-0 max-md:border-b-[3px] max-md:px-3 max-md:py-2",
                  "text-on-dark/40 cursor-default select-none",
                ].join(" ")}
              >
                {item.label}
              </span>
            );
          }

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={active ? "page" : undefined}
              className={[
                "flex items-center gap-2.5 border-l-[3px] py-2.5 pr-5 pl-[21px] text-[14px] whitespace-nowrap",
                "max-md:border-l-0 max-md:border-b-[3px] max-md:px-3 max-md:py-2",
                "transition-colors duration-100 active:translate-y-px",
                active
                  ? "border-l-accent bg-on-dark/[0.10] text-on-dark font-semibold max-md:border-b-accent"
                  : "text-on-dark/80 hover:text-on-dark border-transparent hover:bg-on-dark/[0.07] active:bg-on-dark/10",
              ].join(" ")}
            >
              {item.label}
              {item.badge !== undefined && <span className="num rounded-full bg-on-dark/[0.14] ml-auto px-[7px] py-px text-[11px]">{item.badge}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="min-h-6 flex-1 max-md:hidden" />

      {/* Het blok onderin: wie je bent, wat je kunt instellen, en van wie de tool is. Drie groepjes met een scheiding ertussen. */}
      <div className="border-on-dark/[0.14] mx-3 flex flex-col gap-3.5 border-t px-3 pt-3.5 pb-1 max-md:hidden">
        <div className="flex items-start gap-2.5">
          <div className="font-display bg-accent text-accent-foreground grid h-8 w-8 flex-none place-items-center rounded-full text-xs">{user.initials}</div>
          <div className="min-w-0">
            <div className="text-[13px] leading-tight break-words" title={user.name}>
              {user.name}
            </div>
            <div className="text-on-dark/60 mt-0.5 text-[11px]">{user.roleLabel}</div>
          </div>
        </div>

        {/* Het schuifje boven de knop: instellen staat boven weggaan. */}
        <div className="flex flex-col items-start gap-2">
          {themeToggle}
          {signOut}
        </div>

        {/* Van wie de tool is, en welke versie er draait. Klein en gedempt. Waarom de versie er is, staat in lib/version.ts. */}
        <div className="border-on-dark/[0.14] flex items-center gap-2 border-t pt-3">
          <span className="text-on-dark/55 truncate text-[11px]" title={labels.app.organisation}>
            {labels.app.organisation}
          </span>
          <span className="num text-on-dark/40 ml-auto text-[11px]">{APP_VERSION}</span>
        </div>
      </div>

      {/* Op mobiel staat het gebruikersblok niet in de rail, maar uitloggen moet er wel zijn. */}
      <div className="hidden items-center gap-2 max-md:ml-auto max-md:flex">
        <span className="num text-on-dark/40 text-[11px]">{APP_VERSION}</span>
        {themeToggle}
        {signOut}
      </div>
    </aside>
  );
}
