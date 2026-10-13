/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parseDoc, sectionOf, type DocBlock } from "@/lib/domain/doc-markdown";

/**
 * De documentatie uit de repo inlezen, voor de schermen onder `/about`.
 *
 * **De bron is het bestand en geen kopie.** `RELEASE-NOTES-KORT.md`, `docs/ROADMAP.md` en het
 * besluitenlog in `docs/SPEC.md` worden bij elke PR bijgewerkt, en een tweede versie in de database
 * zou precies zo lang kloppen als iemand eraan denkt hem te verversen.
 *
 * **Daarom staan ze in `outputFileTracingIncludes`** (lib/config/next-base.ts). Next pakt alleen de
 * bestanden mee die hij in de code ziet staan, en een pad dat pas tijdens het draaien wordt
 * samengesteld ziet hij niet. Zonder die regel werkt dit lokaal en geeft het op Vercel een leeg scherm.
 *
 * **Alleen deze drie, als letterlijke paden.** Geen pad uit een URL: dat zou een leesbaar
 * bestandssysteem achter een ingelogde pagina zijn. En geen tabel met bestandsnamen: een `join` met
 * een variabele erin ziet de bundelaar als "ergens in de projectmap".
 */

export type DocName = "releases" | "roadmap" | "decisions";

function pathOf(name: DocName): string {
  if (name === "releases") return join(process.cwd(), "RELEASE-NOTES-KORT.md");
  if (name === "roadmap") return join(process.cwd(), "docs", "ROADMAP.md");
  return join(process.cwd(), "docs", "SPEC.md");
}

/**
 * Eén document als blokken, of een lege lijst als het bestand er niet is. Van de spec alleen het
 * besluitenlog, gesneden op zijn kop, want regelnummers verschuiven bij elke toevoeging.
 */
export async function readDoc(name: DocName): Promise<DocBlock[]> {
  try {
    const text = await readFile(pathOf(name), "utf8");
    return parseDoc(name === "decisions" ? sectionOf(text, "## 3. Besluitenlog") : text);
  } catch {
    /* Een ontbrekend bestand is geen storing van de applicatie: de pagina toont dan dat er niets te lezen is. */
    return [];
  }
}

/** Hoeveel besluiten er staan en welk nummer het hoogste is. Puur, zodat het te testen is zonder bestand. */
export function decisionStand(blocks: readonly DocBlock[]): { count: number; highest: number } {
  let count = 0;
  let highest = 0;

  for (const block of blocks) {
    if (block.kind !== "table") continue;
    for (const row of block.rows) {
      const first = (row[0] ?? []).map((span) => span.text).join("").trim();
      const match = /^D(\d+)$/.exec(first);
      if (match === null) continue;
      count += 1;
      const number = Number(match[1]);
      if (number > highest) highest = number;
    }
  }

  return { count, highest };
}
