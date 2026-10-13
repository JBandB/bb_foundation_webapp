/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { BackLink } from "@/components/ui/back-link";
import { PAGE_X } from "./page-body";

/**
 * De kop van een scherm: eyebrow, titel, en rechts de acties. Zie docs/THEME.md.
 *
 * `back` is de terugverwijzing: een pijl links van de titel, op elk scherm op dezelfde plek. `chips`
 * staan naast de titel: de stand van dit ding, als deel van de kop en niet als tweede regel.
 */
export function PageHeader({
  eyebrow,
  title,
  back,
  actions,
  chips,
}: {
  /** Meestal een tekst; een scherm met een kruimelpad geeft hier een `Breadcrumb` door. */
  eyebrow: React.ReactNode;
  title: string;
  back?: { href: string; label: string };
  actions?: React.ReactNode;
  chips?: React.ReactNode;
}) {
  return (
    <div className={`border-border flex flex-wrap items-end gap-5 border-b pt-[18px] pb-4 ${PAGE_X}`}>
      {back !== undefined && <BackLink href={back.href} label={back.label} />}

      <div className="min-w-0">
        <div className="overline text-muted-foreground mb-[3px]">{eyebrow}</div>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="truncate text-[26px] leading-[1.15]">{title}</h1>
          {chips}
        </div>
      </div>
      {actions !== undefined && <div className="ml-auto flex flex-wrap items-center gap-2.5">{actions}</div>}
    </div>
  );
}
