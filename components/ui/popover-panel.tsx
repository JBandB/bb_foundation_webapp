/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { createContext, useCallback, useContext, useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { labels } from "@/lib/i18n/labels";

/**
 * Een zwevend paneel bij de knop die het opent. Zie CLAUDE.md regel 9.
 *
 * ---
 *
 * **Dit vervangt het uitklappen.** Een knop die een blok ín de pagina opent, schuift alles eronder
 * naar beneden; op een detailscherm met vier onderdelen duwt dat de tabel uit beeld. Een paneel dat
 * erboven zweeft duwt niets weg: wat je aan het lezen was, blijft staan waar het stond.
 *
 * **Ernaast klikken sluit het.** De weg terug moet één klik zijn en je hoeft niet te mikken op een
 * kruisje. Escape doet hetzelfde, want dat is wat een toetsenbord verwacht.
 *
 * **Geen backdrop en geen `showModal`.** De pagina blijft leesbaar terwijl het openstaat. Een
 * `<dialog>` met `showModal()` legt een donkere laag over het scherm en maakt de rest onbereikbaar.
 * De prijs is dat de browser hier niets voor je doet: de focus, Escape en het klikken ernaast staan
 * hieronder met de hand.
 *
 * **Bij de knop en niet in het midden.** Een paneel in het midden van het scherm kost een blik
 * zoeken en daarna een blik terug. Dit staat onder de knop die je net indrukte, en schuift alleen op
 * als het anders buiten beeld zou vallen.
 */
export function PopoverPanel({
  open,
  anchor,
  title,
  onClose,
  children,
  width = 460,
  autoFocus = true,
}: {
  open: boolean;
  /** Het element waar het paneel bij hoort. Bepaalt waar het komt te staan. */
  anchor: HTMLElement | null | undefined;
  /** Wat er in de kop staat, en de naam voor een schermlezer. */
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  /** In pixels. Smaller dan het venster wordt hij vanzelf. */
  width?: number;
  /** De focus naar het paneel zodra het opengaat. Uit voor een paneel dat door aanwijzen opengaat. */
  autoFocus?: boolean;
}) {
  const panel = useRef<HTMLDivElement>(null);
  /* Of een klik ernaast is geweigerd omdat er iets was ingevuld. */
  const [refused, setRefused] = useState(false);

  /* Bij opnieuw openen begint de uitleg schoon. Tijdens het tekenen en niet in een effect. */
  const [wasOpen, setWasOpen] = useState(open);
  if (wasOpen !== open) {
    setWasOpen(open);
    setRefused(false);
  }

  /**
   * Waar het paneel komt te staan: onder de knop, links uitgelijnd, en anders zo dicht mogelijk
   * daarbij. In een `useLayoutEffect` omdat de hoogte pas te meten is als het paneel er staat, en een
   * sprong ná het tekenen zie je.
   */
  useLayoutEffect(() => {
    if (!open) return;

    const place = (): void => {
      const element = panel.current;
      if (element === null) return;

      const rect = anchor?.getBoundingClientRect();
      const margin = 8;
      const height = element.offsetHeight;
      const shown = Math.min(width, window.innerWidth - margin * 2);

      const anchorLeft = rect?.left ?? (window.innerWidth - shown) / 2;
      const anchorRight = rect?.right ?? anchorLeft + shown;
      const anchorBottom = rect?.bottom ?? margin;
      const anchorTop = rect?.top ?? margin;

      /* Links uitgelijnd op de knop, en anders rechts uitgelijnd op de knop: dat leest als een keuze en niet als een botsing met de rand. */
      const fitsRight = anchorLeft + shown + margin <= window.innerWidth;
      const preferred = fitsRight ? anchorLeft : anchorRight - shown;
      const left = Math.max(margin, Math.min(preferred, window.innerWidth - shown - margin));

      const fitsBelow = anchorBottom + height + margin <= window.innerHeight;
      const top = fitsBelow ? anchorBottom + margin : Math.max(margin, anchorTop - height - margin);

      element.style.top = `${top}px`;
      element.style.left = `${left}px`;
      element.style.visibility = "visible";
    };

    place();

    /* Meeschuiven met de pagina en met het venster. `capture` omdat een geneste scrollbak zijn gebeurtenis niet naar `window` bubbelt. */
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open, anchor, width]);

  /**
   * Ernaast klikken sluit, Escape ook. Op `pointerdown` en niet op `click`: wie in het paneel begint
   * te slepen en buiten loslaat, doet dat om tekst te selecteren. **Behalve als er iets is ingevuld:**
   * dan is je invoer weg, en dat is precies wat gebruikers melden. Sluiten kan dan met Escape, met
   * het kruisje of door op te slaan, en het paneel zegt dat ook.
   */
  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: PointerEvent): void => {
      const target = event.target;
      if (!(target instanceof Node)) return;
      if (panel.current?.contains(target) === true) return;
      if (anchor?.contains(target) === true) return;
      /*
       * Een klik in een genest paneel telt als binnen. Panelen komen via een portal los in
       * `document.body` te staan, dus een paneel dat vanuit dit paneel is geopend is geen DOM-kind.
       * Alleen een paneel dat ná dit paneel is geopend telt als genest.
       */
      if (target instanceof Element && panel.current !== null) {
        const dialog = target.closest('[role="dialog"]');
        if (dialog !== null && (panel.current.compareDocumentPosition(dialog) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0) return;
      }

      if (panel.current !== null && hasChanges(panel.current)) {
        setRefused(true);
        return;
      }
      onClose();
    };

    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape") onClose();
    };

    window.addEventListener("pointerdown", onPointerDown, true);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onPointerDown, true);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, anchor, onClose]);

  /** De focus naar het paneel, zodat typen en Escape meteen aankomen. */
  useEffect(() => {
    if (!open || !autoFocus) return;
    panel.current?.querySelector<HTMLElement>("input:not([type=hidden]), select, textarea, button")?.focus();
  }, [open, autoFocus]);

  if (!open) return null;

  /*
   * Via een portal naar `document.body`. Een `position: fixed` element rekent vanaf het venster, tenzij
   * een ouder een `transform` heeft; en een paneel uit een tabelrij zou als `<div>` in een `<tbody>`
   * ongeldige HTML zijn.
   */
  return createPortal(
    <div
      ref={panel}
      role="dialog"
      aria-label={title}
      /* Onzichtbaar tot het layouteffect hem heeft neergezet, anders staat hij één beeld lang linksboven. */
      style={{ top: 0, left: 0, visibility: "hidden", width: `min(${width}px, calc(100vw - 16px))` }}
      className="border-border rounded-lg bg-popover shadow-panel fixed z-50 max-h-[80vh] overflow-y-auto border p-5"
    >
      <div className="mb-2 flex items-baseline gap-2">
        <span className="overline text-muted-foreground">{title}</span>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground ml-auto cursor-pointer text-[11px] underline underline-offset-2">
          {labels.ui.close}
        </button>
      </div>

      {refused && <p className="border-border bg-muted text-muted-foreground mb-3 rounded-md border px-3 py-2 text-[12px]">{labels.ui.popoverKeepOpen}</p>}

      {children}
    </div>,
    document.body,
  );
}

/**
 * Of er in dit paneel iets is ingevuld of veranderd sinds het openging.
 *
 * De DOM is de bron en niet een state ernaast: elk veld draagt zijn eigen beginwaarde (`defaultValue`,
 * `defaultChecked`, de `selected`-optie), dus de vergelijking is er al en hoeft niet door elk
 * formulier apart te worden bijgehouden.
 */
function hasChanges(root: HTMLElement): boolean {
  const fields = root.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input, textarea, select");

  for (const field of fields) {
    if (field instanceof HTMLSelectElement) {
      if ([...field.options].some((option) => option.selected !== option.defaultSelected)) return true;
      continue;
    }

    if (field instanceof HTMLInputElement) {
      const kind = field.type;
      if (kind === "hidden" || kind === "submit" || kind === "button") continue;
      if (kind === "file") {
        if (field.files !== null && field.files.length > 0) return true;
        continue;
      }
      if (kind === "checkbox" || kind === "radio") {
        if (field.checked !== field.defaultChecked) return true;
        continue;
      }
    }

    if (field.value !== field.defaultValue) return true;
  }

  return false;
}

/**
 * Een knop met zijn eigen paneel eraan. Vervangt de uitklapper (`<details>`) op de plekken waar die
 * een formulier of een detail toonde. Een uitklapper die een lijst toont blijft wat hij is: door een
 * hiërarchie bladeren hoort geen reeks vensters te zijn.
 */
export function PopoverDisclosure({
  label,
  title,
  children,
  className = "text-muted-foreground hover:text-accent-quiet cursor-pointer text-[11px]",
  srLabel,
  width,
}: {
  label: React.ReactNode;
  /** De kop van het paneel. */
  title: string;
  children: React.ReactNode;
  className?: string;
  /** Extra tekst voor een schermlezer, om welke regel het gaat. */
  srLabel?: string;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);

  return (
    <>
      <button ref={setTrigger} type="button" aria-expanded={open} onClick={() => setOpen((value) => !value)} className={className}>
        {label}
        {srLabel !== undefined && <span className="sr-only"> {srLabel}</span>}
      </button>

      <PopoverPanel open={open} anchor={trigger} title={title} onClose={() => setOpen(false)} {...(width === undefined ? {} : { width })}>
        {children}
      </PopoverPanel>
    </>
  );
}

/**
 * Uitleg bij aanwijzen: hetzelfde zwevende paneel, maar hij gaat open van een muis erboven en van
 * de tab-toets, en blijft staan als je klikt.
 *
 * Aanwijzen bestaat niet op een telefoon en niet op een toetsenbord, vandaar alle drie: muis, focus
 * en klik. Klikken zet hem vast, zodat de tekst te selecteren is en een link erin te volgen. Geen
 * `title`-attribuut: de browser wacht er een seconde mee, knipt lange tekst af en toont hem niet bij
 * toetsenbordfocus.
 */
export function HoverHint({
  label,
  title,
  children,
  className = "text-muted-foreground hover:text-foreground cursor-help border-b border-dotted border-current",
  srLabel,
  width = 380,
}: {
  label: React.ReactNode;
  title: string;
  children: React.ReactNode;
  className?: string;
  srLabel?: string;
  width?: number;
}) {
  const [open, setOpen] = useState(false);
  const [pinned, setPinned] = useState(false);
  const [trigger, setTrigger] = useState<HTMLButtonElement | null>(null);

  const close = useCallback(() => {
    setPinned(false);
    setOpen(false);
  }, []);

  return (
    <>
      <button
        ref={setTrigger}
        type="button"
        aria-expanded={open}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          if (!pinned) setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!pinned) setOpen(false);
        }}
        onClick={() => {
          if (pinned) close();
          else {
            setPinned(true);
            setOpen(true);
          }
        }}
        className={className}
      >
        <span>{label}</span>
        {srLabel !== undefined && <span className="sr-only"> {srLabel}</span>}
      </button>

      <PopoverPanel open={open} anchor={trigger} title={title} onClose={close} width={width} autoFocus={false}>
        {children}
      </PopoverPanel>
    </>
  );
}

/**
 * Een tabelrij die je aanklikt om hem te wijzigen.
 *
 * Twee ingangen, met opzet. De hele rij reageert op een klik, want dat is wat iemand met een muis
 * probeert. En één ding in de rij is een echte `<button>` (`RowTrigger`), want een `<tr>` is geen
 * bedieningselement: hij is niet te focussen met de tab-toets en een schermlezer kondigt hem niet
 * als knop aan. Klikken op een link of knop in de rij blijft daar.
 */
const RowContext = createContext<{ open: boolean; toggle: () => void } | undefined>(undefined);

export function EditableRow({ title, panel, width, children }: { title: string; panel: React.ReactNode; width?: number; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [row, setRow] = useState<HTMLTableRowElement | null>(null);
  const toggle = useCallback(() => setOpen((value) => !value), []);

  const fromRow = (event: React.MouseEvent<HTMLTableRowElement>): void => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, label") !== null) return;
    toggle();
  };

  return (
    <tr ref={setRow} onClick={fromRow} className="border-border hover:bg-secondary cursor-pointer border-b transition-colors duration-100 last:border-0">
      <RowContext.Provider value={{ open, toggle }}>{children}</RowContext.Provider>

      <PopoverPanel open={open} anchor={row} title={title} onClose={() => setOpen(false)} {...(width === undefined ? {} : { width })}>
        {panel}
      </PopoverPanel>
    </tr>
  );
}

/** Het stukje van de rij dat de echte knop is. Buiten een `EditableRow` is dit gewoon tekst. */
export function RowTrigger({ children }: { children: React.ReactNode }) {
  const row = useContext(RowContext);
  if (row === undefined) return <>{children}</>;

  return (
    <button
      type="button"
      aria-expanded={row.open}
      onClick={row.toggle}
      className="hover:text-accent-quiet cursor-pointer text-left underline decoration-transparent underline-offset-2 transition-colors duration-100 hover:decoration-current"
    >
      {children}
      <span className="sr-only"> {labels.ui.edit}</span>
    </button>
  );
}
