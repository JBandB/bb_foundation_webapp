/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De laadtoestand tussen twee schermen.
 *
 * Elke navigatie wacht op de database, en bij een koude database kan dat seconden duren. Zonder
 * laadtoestand staat het oude scherm die seconden bevroren in beeld, en dat voelt als kapot. Een
 * skelet en geen spinner: een vlak op de plek van de kop en de inhoud zegt ook wáár het komt.
 *
 * `prefers-reduced-motion` wordt gerespecteerd in globals.css, waar de `.skeleton`-klasse woont.
 *
 * **Niet boven een tak die met `notFound()` afschermt.** Een laadgrens maakt van de pagina een
 * stream, en dan zijn de HTTP-headers al verstuurd voordat `notFound()` zijn 404 kan zetten. De
 * beheertabbladen beloven een echte 404 aan wie er niets te zoeken heeft, dus die tak heeft geen
 * `loading.tsx`.
 */
export function LoadingSkeleton() {
  return (
    <div aria-busy="true" aria-live="polite" className="flex flex-col">
      <div className="border-border border-b px-6 py-5 max-md:px-4">
        <div className="skeleton h-3 w-24" />
        <div className="skeleton mt-2 h-6 w-56" />
      </div>
      <div className="flex flex-col gap-3 px-6 py-6 max-md:px-4">
        <div className="skeleton h-9 w-full max-w-[640px]" />
        <div className="skeleton h-9 w-full max-w-[560px]" />
        <div className="skeleton h-9 w-full max-w-[600px]" />
      </div>
    </div>
  );
}
