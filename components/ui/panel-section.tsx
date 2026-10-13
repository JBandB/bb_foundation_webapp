/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { useState } from "react";
import { labels } from "@/lib/i18n/labels";
import { PopoverPanel } from "./popover-panel";

/**
 * Een sectie met een Update-knop en een plusje rechtsboven. Zie CLAUDE.md regel 9.
 *
 * ---
 *
 * **Eén afspraak voor de hele applicatie:** "Update" wijzigt wat er staat, een plusje maakt iets
 * nieuws. Overal op dezelfde plek, rechts naast de sectiekop, en overal met hetzelfde gedrag. Dat is
 * de reden dat dit een component is en geen patroon: een patroon wordt op het vijfde scherm anders
 * uitgevoerd.
 *
 * **Een woord en geen tandwiel.** Een icoon dat "wijzigen" betekent moet je één keer leren, en naast
 * een plusje is de vraag welke van de twee nu welke was. De prijs is breedte.
 *
 * **Wat er open staat zweeft bij de knop en zit niet in de pagina.** Een paneel dat in de pagina
 * groeit duwt alles eronder weg; op een detailscherm met vier onderdelen duwt dat het overzicht uit
 * beeld. Nu blijft staan wat er staat, en klikken naast het paneel brengt je terug. Zie popover-panel.tsx.
 *
 * **Hoogstens één paneel open.** Wijzigen en nieuw aanmaken zijn twee dingen die je niet tegelijk
 * doet, en twee open formulieren onder elkaar is precies de drukte waar dit vanaf moet.
 *
 * Een clientcomponent, want de knop in de kop en het paneel dat erbij hoort zijn twee plekken in de
 * DOM die niet in elkaar zitten. Het kost niets: elk formulier dat erin komt gebruikt `useActionState`
 * en is dus al een clientcomponent.
 */

type Props = {
  title: string;
  intro?: string;
  /** Het formulier achter Update. Laat weg als er niets te wijzigen valt; dat is dan een uitspraak over het model. */
  edit?: React.ReactNode;
  /** Het formulier achter het plusje. Laat weg als er niets toe te voegen valt. */
  plus?: React.ReactNode;
  /** Wat er onder de panelen staat: de tabel, de lijst, het overzicht. */
  children: React.ReactNode;
  /** Een extra knop rechts van de iconen, zoals een downloadlink. */
  extra?: React.ReactNode;
  /**
   * De kop alleen voor schermlezers, niet in beeld. Voor een tabblad met één onderwerp, waar de
   * paginatitel hetzelfde zegt. De kop blijft wél in de DOM, want een sectie zonder kop is voor een
   * schermlezer een sectie zonder naam.
   */
  titleHidden?: boolean;
  /**
   * Welk paneel al open staat bij het binnenkomen. Voor één geval: je komt net van een scherm dat je
   * hierheen stuurde om iets toe te voegen. Verder blijft dicht de standaard.
   */
  openAt?: "edit" | "plus" | undefined;
};

const ICON = "grid h-8 w-8 place-items-center rounded-md border transition-colors duration-100 active:translate-y-px cursor-pointer";
const WORD = "font-display grid h-8 place-items-center rounded-md border px-2.5 text-[12px] font-medium transition-colors duration-100 active:translate-y-px cursor-pointer";
const OPEN = "border-accent-quiet bg-accent-quiet text-on-dark";
const CLOSED = "border-border-strong bg-card text-foreground-soft hover:border-border-strong hover:text-foreground";

export function PanelSection({ title, intro, edit, plus, children, extra, titleHidden = false, openAt }: Props) {
  const [open, setOpen] = useState<"edit" | "plus" | null>(openAt ?? null);
  /* De knoppenbalk als anker van het paneel. Als state en niet als ref, want het paneel heeft het element nodig tijdens het tekenen. */
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);

  /** Klikken op de knop die al open staat, sluit het. Zo is er altijd een weg terug. */
  const toggle = (which: "edit" | "plus"): void => setOpen((current) => (current === which ? null : which));

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <h2 className={titleHidden ? "sr-only" : "text-[17px] leading-tight"}>{title}</h2>
          {intro !== undefined && <p className="text-foreground-soft mt-1 max-w-[80ch] text-[12px]">{intro}</p>}
        </div>

        <div ref={setAnchor} className="ml-auto flex items-center gap-2">
          {extra}

          {edit !== undefined && (
            <button
              type="button"
              onClick={() => toggle("edit")}
              aria-expanded={open === "edit"}
              aria-label={`${labels.ui.edit}: ${title}`}
              title={`${labels.ui.edit}: ${title}`}
              className={`${WORD} ${open === "edit" ? OPEN : CLOSED}`}
            >
              {labels.ui.edit}
            </button>
          )}

          {plus !== undefined && (
            <button
              type="button"
              onClick={() => toggle("plus")}
              aria-expanded={open === "plus"}
              aria-label={`${labels.ui.add}: ${title}`}
              title={`${labels.ui.add}: ${title}`}
              className={`${ICON} ${open === "plus" ? OPEN : CLOSED}`}
            >
              <PlusIcon />
            </button>
          )}
        </div>
      </div>

      <PopoverPanel open={open !== null} anchor={anchor} title={`${open === "edit" ? labels.ui.edit : labels.ui.add}: ${title}`} onClose={() => setOpen(null)} width={560}>
        {open === "edit" ? edit : plus}
      </PopoverPanel>

      {children}
    </section>
  );
}

/** Als SVG en niet als tekst of emoji: `currentColor` volgt de knop, dus er staat geen kleurwaarde in een component. */
function PlusIcon() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="h-[15px] w-[15px]" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <path d="M8 3v10M3 8h10" />
    </svg>
  );
}
