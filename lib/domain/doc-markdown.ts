/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De documentatie uit de repo leesbaar maken in de tool: koppen, alinea's, lijsten en tabellen.
 *
 * **Waarom dit naast `rich-text.ts` staat.** Dat bestand is het opmerkingenveld: vet, cursief en
 * opsommingen, en met opzet niets meer. Wat hier binnenkomt zijn `RELEASE-NOTES-KORT.md`,
 * `docs/ROADMAP.md` en het besluitenlog, en die gebruiken koppen, tabellen en `code`. De
 * inline-opmaak wordt gedeeld: `parseSpans` doet vet en cursief, en dit bestand legt er alleen de
 * code-stukken omheen.
 *
 * **Geen markdown-bibliotheek.** Elke bibliotheek geeft een HTML-string terug en die moet dan met
 * `dangerouslySetInnerHTML` het scherm op. Deze parser geeft een structuur, en de weergave tekent hem
 * als JSX.
 *
 * **Wat het kent:** `#` tot `####`, alinea's, opsommingen (met of zonder nummer), tabellen met een
 * scheidingsregel, en fenced code. Wat het niet kent: links, afbeeldingen, citaten, geneste lijsten.
 * Een parser die meer kan dan er in de bron staat is een parser die je niet kunt bewijzen.
 */

import { parseSpans, type RichSpan } from "./rich-text";

/** Een stukje tekst in een regel: gewone tekst, vet, cursief of `code`. */
export type DocSpan = RichSpan & { code?: boolean };

export type DocBlock =
  | { kind: "heading"; level: number; spans: DocSpan[] }
  | { kind: "paragraph"; spans: DocSpan[] }
  | { kind: "list"; ordered: boolean; items: DocSpan[][] }
  | { kind: "table"; head: DocSpan[][]; rows: DocSpan[][][] }
  | { kind: "code"; text: string };

/** De tekens binnen één regel, inclusief `code`. Eerst op backticks splitsen, zodat een sterretje binnen code een sterretje blijft. */
export function parseDocSpans(line: string): DocSpan[] {
  const spans: DocSpan[] = [];

  for (const [index, part] of line.split("`").entries()) {
    if (part === "") continue;
    /* De oneven stukken stonden tussen backticks; een niet-afgesloten backtick is gewone tekst. */
    if (index % 2 === 1) spans.push({ text: part, code: true });
    else spans.push(...parseSpans(part));
  }

  return spans;
}

/** De cellen van een tabelregel. `\|` binnen een cel is een gewone pijp en geen scheiding. */
function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split(/(?<!\\)\|/)
    .map((cell) => cell.replace(/\\\|/g, "|").trim());
}

const isTableLine = (line: string): boolean => line.trim().startsWith("|");
const isSeparator = (line: string): boolean => /^\s*\|?[\s:|-]+\|[\s:|-]*$/.test(line) && line.includes("-");

/** Een regel die een opsommingsteken is, met de tekst erachter. */
function bullet(line: string): { ordered: boolean; text: string } | undefined {
  const dash = /^\s*[-*]\s+(.*)$/.exec(line);
  if (dash !== null) return { ordered: false, text: dash[1] ?? "" };

  const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
  if (numbered !== null) return { ordered: true, text: numbered[1] ?? "" };

  return undefined;
}

/** Een markdownbestand als blokken. */
export function parseDoc(text: string): DocBlock[] {
  const blocks: DocBlock[] = [];
  const lines = text.replace(/\r\n/g, "\n").split("\n");

  let paragraph: string[] = [];
  let list: { ordered: boolean; items: DocSpan[][] } | undefined;

  const closeParagraph = (): void => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", spans: parseDocSpans(paragraph.join(" ")) });
    paragraph = [];
  };

  const closeList = (): void => {
    if (list === undefined) return;
    blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
    list = undefined;
  };

  const closeAll = (): void => {
    closeParagraph();
    closeList();
  };

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? "";

    /* Fenced code: alles tot de volgende afsluiting blijft zoals het is. */
    if (line.trim().startsWith("```")) {
      closeAll();
      const body: string[] = [];
      index += 1;
      while (index < lines.length && !(lines[index] ?? "").trim().startsWith("```")) {
        body.push(lines[index] ?? "");
        index += 1;
      }
      blocks.push({ kind: "code", text: body.join("\n") });
      continue;
    }

    /* Een HTML-commentaar (zoals de kopregel van het template) hoort niet op het scherm. */
    if (line.trim().startsWith("<!--") && line.trim().endsWith("-->")) {
      closeAll();
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading !== null) {
      closeAll();
      blocks.push({ kind: "heading", level: (heading[1] ?? "#").length, spans: parseDocSpans(heading[2] ?? "") });
      continue;
    }

    /*
     * Een tabel: de kopregel, de scheidingsregel, en daarna de rijen. Een lege regel tussen twee rijen
     * breekt de tabel niet: in een besluitenlog staan er regelmatig witregels tussen de besluiten om
     * de bron leesbaar te houden. De tabel loopt door zolang er na de witruimte weer een tabelregel komt.
     */
    if (isTableLine(line) && isSeparator(lines[index + 1] ?? "")) {
      closeAll();
      const head = cells(line).map(parseDocSpans);
      const rows: DocSpan[][][] = [];
      index += 2;

      while (index < lines.length) {
        const row = lines[index] ?? "";

        if (row.trim() === "") {
          let ahead = index + 1;
          while (ahead < lines.length && (lines[ahead] ?? "").trim() === "") ahead += 1;
          if (!isTableLine(lines[ahead] ?? "")) break;
          index = ahead;
          continue;
        }

        if (!isTableLine(row)) break;
        /* Een herhaalde scheidingsregel is opmaak van de bron en geen rij. */
        if (!isSeparator(row)) rows.push(cells(row).map(parseDocSpans));
        index += 1;
      }

      index -= 1;
      blocks.push({ kind: "table", head, rows });
      continue;
    }

    const point = bullet(line);
    if (point !== undefined) {
      closeParagraph();
      if (list === undefined || list.ordered !== point.ordered) {
        closeList();
        list = { ordered: point.ordered, items: [] };
      }
      list.items.push(parseDocSpans(point.text));
      continue;
    }

    closeList();

    if (line.trim() === "") {
      closeParagraph();
      continue;
    }

    paragraph.push(line.trim());
  }

  closeAll();
  return blocks;
}

/**
 * Eén hoofdstuk uit een document, op de tekst van zijn kop. Eindigt bij de volgende kop van hetzelfde
 * niveau of hoger, of aan het eind van het bestand.
 */
export function sectionOf(text: string, startsWith: string): string {
  const lines = text.replace(/\r\n/g, "\n").split("\n");
  const start = lines.findIndex((line) => line.startsWith(startsWith));
  if (start === -1) return "";

  const level = /^(#+)/.exec(lines[start] ?? "")?.[1]?.length ?? 2;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => {
    const heading = /^(#+)\s/.exec(line);
    return heading !== null && (heading[1] ?? "").length <= level;
  });

  return [lines[start], ...(end === -1 ? rest : rest.slice(0, end))].join("\n");
}
