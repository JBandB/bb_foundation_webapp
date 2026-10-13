/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import Link from "next/link";

/**
 * Terug naar waar je vandaan kwam: één pijl, overal dezelfde. Zie CLAUDE.md regel 9.
 *
 * **De tekst blijft, maar alleen voor wie hem nodig heeft.** Het label staat in `aria-label` en in
 * `title`: een schermlezer leest "Terug naar het overzicht", een muis krijgt hem bij het zweven, en
 * op het scherm staat een pijl. Er is er precies één per scherm en hij staat naast de titel.
 *
 * **Zelfde vorm als het plusje in een sectiekop:** 32 bij 32, dezelfde rand, dezelfde hover, en hij
 * zakt een pixel bij het indrukken. Het is een navigatie-element, dus hij hoort links van de titel.
 */
export function BackLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      aria-label={label}
      title={label}
      className="border-border-strong bg-card text-foreground-soft hover:text-foreground grid h-8 w-8 shrink-0 place-items-center rounded-md border transition-colors duration-100 active:translate-y-px"
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12.5 8H3.5M7 3.5 3 8l4 4.5" />
      </svg>
    </Link>
  );
}
