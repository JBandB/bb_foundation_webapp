/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import Link from "next/link";

/**
 * Een blok dat een onderwerp samenvat en naar het volle scherm wijst. Voor een landing die een
 * dashboard is: samenvatten en doorverwijzen.
 *
 * **Drie regels en niet meer.** Een samenvatting die alles herhaalt is het scherm zelf. Wat hier staat
 * is het antwoord op "moet ik hier zijn", niet op "wat staat er precies".
 *
 * **Goedkoop, dat is de afspraak.** De aanroeper vult dit met aggregaten. Alles wat een detailquery
 * kost, hoort achter de link en niet in het blok.
 *
 * **De hele kaart is de link**, met een pseudo-element over het blok in plaats van een anker om alles
 * heen, zodat de opmaak binnen een link geldig blijft.
 */
export function SummaryBlock({
  title,
  href,
  linkLabel,
  lines,
  note,
}: {
  title: string;
  href: string;
  /** Wat er onderaan staat, en wat een schermlezer hoort. */
  linkLabel: string;
  /** Hoogstens drie. De waarde mag een element zijn. */
  lines: readonly { label: string; value: React.ReactNode }[];
  note?: string;
}) {
  return (
    <div className="border-border rounded-lg bg-card hover:border-accent-quiet relative flex flex-col gap-3 border p-4 transition-colors duration-100">
      <h3 className="overline text-muted-foreground">{title}</h3>

      <dl className="flex flex-col gap-1.5">
        {lines.map((line) => (
          <div key={line.label} className="flex items-baseline justify-between gap-3">
            <dt className="text-muted-foreground text-[12px]">{line.label}</dt>
            <dd className="num text-[14px] font-semibold">{line.value}</dd>
          </div>
        ))}
      </dl>

      {note !== undefined && <p className="text-subtle-foreground text-[11px] leading-snug">{note}</p>}

      <Link href={href} className="hover:text-accent-quiet mt-auto text-[12px] underline underline-offset-2 after:absolute after:inset-0 after:rounded-lg">
        {linkLabel}
      </Link>
    </div>
  );
}

/** Een rij blokken die netjes wikkelt. */
export function SummaryRow({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 [grid-template-columns:repeat(auto-fit,minmax(240px,1fr))]">{children}</div>;
}
