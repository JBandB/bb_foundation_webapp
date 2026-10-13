/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import Link from "next/link";

/**
 * De inhoud onder een `PageHeader`.
 *
 * Elk scherm zou anders zijn eigen marge kiezen, en zodra één scherm afwijkt loopt de linkermarge niet
 * meer door van de kop naar de tabel eronder. Eén component, één waarde.
 */

/** De horizontale marge van elk scherm. Ook gebruikt door `PageHeader`. */
export const PAGE_X = "px-[30px] max-md:px-4";

export function PageBody({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  /* De ondermarge is de hoogte van de zwevende feedbackknop plus lucht, zodat die knop niet over de onderste regels hangt. */
  return <div className={`${PAGE_X} flex flex-col gap-8 pt-6 pb-[96px] ${className}`}>{children}</div>;
}

/** Een blok met een kop en een toelichting, zonder bewerkingen. Met bewerkingen: `PanelSection`. */
export function Section({ title, intro, actions, children }: { title: string; intro?: string; actions?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <h2 className="text-[17px] leading-tight">{title}</h2>
          {intro !== undefined && <p className="text-foreground-soft mt-1 max-w-[80ch] text-[12px]">{intro}</p>}
        </div>
        {actions !== undefined && <div className="ml-auto flex items-center gap-2.5">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

/**
 * Een kaart met een getal erin, voor een dashboard. Het getal is groot en het label klein, want in
 * een dashboard zoek je eerst het cijfer en pas daarna wat het betekent. Met `href` is de hele kaart
 * een deur naar de regels achter het getal.
 */
export function Stat({
  label,
  value,
  note,
  tone = "neutral",
  href,
  linkLabel,
}: {
  label: React.ReactNode;
  value: React.ReactNode;
  note?: React.ReactNode;
  tone?: "neutral" | "warn" | "bad";
  href?: string;
  /** Hoe die weg heet voor een schermlezer: een getal alleen zegt niet waar je heen gaat. */
  linkLabel?: string;
}) {
  const border = tone === "bad" ? "border-destructive/45" : tone === "warn" ? "border-warning/40" : "border-border";

  return (
    <div className={`rounded-lg bg-card relative border p-5 ${border} ${href === undefined ? "" : "hover:border-accent-quiet transition-colors duration-100"}`}>
      <div className="overline text-muted-foreground relative z-10">{label}</div>
      <div className="num font-display mt-2 text-[26px] leading-none font-semibold">
        {href === undefined ? (
          value
        ) : (
          <Link href={href} {...(linkLabel === undefined ? {} : { "aria-label": linkLabel })} className="hover:text-accent-quiet after:absolute after:inset-0 after:rounded-lg">
            {value}
          </Link>
        )}
      </div>
      {note !== undefined && <div className="text-muted-foreground mt-1.5 text-[11px] leading-snug">{note}</div>}
    </div>
  );
}

/** Een rij statkaarten die netjes wikkelt. */
export function StatRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">{children}</div>;
}
