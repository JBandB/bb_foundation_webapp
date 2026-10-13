/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { labels } from "@/lib/i18n/labels";
import { PROJECT } from "@/lib/project/config.generated";

/**
 * Het merk van de applicatie, in de rail en op het inlogscherm.
 *
 * Twee vormen, uit project.config.json. Een **tekstmerk** (`wordmark`): de korte naam in de
 * koppenletter, en dat is typografie en geen plaatje. Een **afbeelding** (`image`): een SVG uit
 * `public/brand/`, met een aparte versie voor de donkere modus als het logo daar niet leesbaar is. Een
 * logo wordt nooit nagetekend in tekst of CSS: dat levert altijd iets op dat er net naast zit.
 *
 * De maat komt van de ouder: `text-[22px]` op de aanroep schaalt het tekstmerk, en bij een afbeelding
 * bepaalt `className` de hoogte.
 */
export function Mark({
  tone = "auto",
  className = "",
}: {
  /** `auto` volgt de modus; `on-dark` is voor een vlak dat in beide modi donker is, zoals de rail. */
  tone?: "auto" | "on-dark";
  className?: string;
}) {
  if (PROJECT.logo.kind === "image") {
    const light = `/${PROJECT.logo.path.replace(/^public\//, "")}`;
    const dark = PROJECT.logo.darkPath === null ? light : `/${PROJECT.logo.darkPath.replace(/^public\//, "")}`;
    const useDark = tone === "on-dark";
    return (
      <>
        {/* eslint-disable-next-line @next/next/no-img-element -- een SVG uit public/brand, geen foto */}
        <img src={useDark ? dark : light} alt={labels.app.name} className={`block ${useDark ? "" : "dark:hidden"} ${className}`} />
        {!useDark && dark !== light && (
          // eslint-disable-next-line @next/next/no-img-element -- de donkere variant, alleen zichtbaar in die modus
          <img src={dark} alt="" aria-hidden="true" className={`hidden dark:block ${className}`} />
        )}
      </>
    );
  }

  const colour = tone === "on-dark" ? "text-on-dark" : "text-foreground";
  return (
    <span role="img" aria-label={labels.app.name} className={`${colour} font-display inline-block leading-none font-semibold tracking-[-0.03em] ${className}`}>
      {PROJECT.shortName}
    </span>
  );
}
