/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { useRouter } from "next/navigation";

/**
 * Een tabelrij die als geheel naar een pagina leidt.
 *
 * Zelfde tweedeling als `EditableRow`: de hele rij reageert op een klik, want dat is wat iemand met
 * een muis probeert, en één element in de rij blijft een echte link, want een `<tr>` is geen
 * navigatie-element voor een toetsenbord of schermlezer. Klikken op iets anders interactiefs in de rij
 * blijft daar.
 */
export function LinkRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();

  const fromRow = (event: React.MouseEvent<HTMLTableRowElement>): void => {
    const target = event.target as HTMLElement;
    if (target.closest("button, a, input, select, textarea, label") !== null) return;
    router.push(href);
  };

  return (
    <tr onClick={fromRow} className="border-border hover:bg-secondary cursor-pointer border-b transition-colors duration-100 last:border-0">
      {children}
    </tr>
  );
}
