/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Formuliervelden die op één lijn blijven staan, ook met een subtekst eronder.
 *
 * Een veld is een kolom van drie dingen: label, invoer, subtekst. Zet je die naast elkaar in een
 * flexrij, dan is een veld met subtekst hoger dan een veld zonder, en dan staan de invoervakken niet
 * meer op één lijn. De oplossing is subgrid: de rij is een raster, elk veld beslaat drie rijen daarvan
 * en erft die rijen. Alle labels delen dus één rij, alle invoervakken één, en alle subteksten één.
 */

const CONTROL = "border-border-strong rounded-md bg-input hover:border-border-strong w-full border px-2 text-[13px] transition-colors duration-100";

/** Een invoerveld of een keuzelijst: 36 pixels hoog. */
export const controlClass = `${CONTROL} h-9`;

/** Een tekstvak, dus zonder die vaste hoogte: `h-9` zou `rows` overstemmen. */
export const textareaClass = `${CONTROL} py-2`;

export function FieldRow({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <div className={`grid items-end gap-x-3 gap-y-3 [grid-template-columns:repeat(auto-fit,minmax(150px,1fr))] ${className}`}>{children}</div>;
}

/** Eén veld. Hoort altijd in een `FieldRow` te staan. `grow` laat een veld twee kolommen pakken. */
export function Field({ label, hint, grow = false, children }: { label: string; hint?: string | undefined; grow?: boolean | undefined; children: React.ReactNode }) {
  return (
    <label className={`row-span-3 grid grid-rows-subgrid gap-1 ${grow ? "[grid-column:span_2]" : ""}`}>
      <span className="label self-end">{label}</span>
      {children}
      {/* De cel staat er altijd, ook zonder tekst, anders klopt de subgrid niet meer. */}
      <span className="text-muted-foreground text-[11px] leading-snug">{hint ?? ""}</span>
    </label>
  );
}

/** De verzendknop van een rij velden, op de invoerrij. */
export function FieldAction({ children }: { children: React.ReactNode }) {
  return (
    <div className="row-span-3 grid grid-rows-subgrid gap-1">
      <span aria-hidden="true" />
      <div className="flex items-center">{children}</div>
      <span aria-hidden="true" />
    </div>
  );
}

/** Een foutmelding onder een formulier, met de juiste rol voor een schermlezer. */
export function FormError({ message }: { message: string | undefined }) {
  if (message === undefined) return null;
  return (
    <p role="alert" className="border-destructive text-destructive rounded-md border px-3 py-2 text-[13px]">
      {message}
    </p>
  );
}

/** Een bevestiging, zoals "opgeslagen". */
export function FormDone({ message }: { message: string | undefined }) {
  if (message === undefined) return null;
  return (
    <p role="status" className="border-accent-quiet text-accent-quiet rounded-md border px-3 py-2 text-[13px]">
      {message}
    </p>
  );
}
