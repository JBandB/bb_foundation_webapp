/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wat er staat als er niets staat.
 *
 * Een lege lijst als een regel gedempte tekst links tegen de rand leest als een fout. Gecentreerd met
 * een kader eromheen leest hetzelfde als een antwoord.
 *
 * **Twee soorten leeg, en dat verschil hoort in de tekst te zitten.** "Er is nog niets" vraagt om een
 * knop; "je filter levert niets op" vraagt om het filter aan te passen. De component dwingt dat niet
 * af, `action` is optioneel, maar de aanroeper hoort de vraag te stellen. Geen illustratie.
 */
export function EmptyState({
  title,
  body,
  glyph = "·",
  action,
}: {
  title: string;
  body?: string | undefined;
  /** Een enkel teken in het kader erboven. Geen emoji: die kleuren niet mee met de modus. */
  glyph?: string | undefined;
  action?: React.ReactNode | undefined;
}) {
  return (
    <div className="mx-auto flex max-w-[320px] flex-col items-center gap-2 py-10 text-center">
      <div aria-hidden="true" className="bg-muted text-subtle-foreground rounded-md grid h-10 w-10 place-items-center text-[18px]">
        {glyph}
      </div>
      <h3 className="text-[17px] leading-tight">{title}</h3>
      {body !== undefined && <p className="text-muted-foreground text-[13px] leading-snug">{body}</p>}
      {action !== undefined && <div className="mt-1">{action}</div>}
    </div>
  );
}
