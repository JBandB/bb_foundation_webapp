/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Een klein stukje markdown: vet, cursief, en opsommingen.
 *
 * **Waarom geen editor.** Een WYSIWYG-editor is honderden kilobytes JavaScript, hij slaat HTML op, en
 * dan moet er aan de leeskant gesaneerd worden, aan beide kanten, voor altijd. Wat er in een tekstveld
 * staat is tekst, en dat blijft het: de tekens `**` en `- ` zijn de opmaak.
 *
 * **Waarom geen HTML uit een bibliotheek.** Op een tekst die een gebruiker heeft getypt is
 * `dangerouslySetInnerHTML` precies de fout die je niet wil maken. Deze parser geeft een structuur
 * terug die de weergave als JSX tekent: er is geen pad waarlangs `<script>` het scherm bereikt.
 *
 * **Wat het kent, en niet meer:** `**vet**` en `*cursief*`, een regel die begint met `- ` of `* ` is
 * een opsomming, een regel die begint met `1. ` een genummerde, een lege regel begint een nieuwe
 * alinea. Een `#` blijft een `#`.
 */

export interface RichSpan {
  readonly text: string;
  readonly bold?: boolean;
  readonly italic?: boolean;
}

export type RichBlock = { kind: "paragraph"; spans: RichSpan[] } | { kind: "list"; ordered: boolean; items: RichSpan[][] };

function bullet(line: string): { ordered: boolean; text: string } | undefined {
  const dash = /^\s*[-*]\s+(.*)$/.exec(line);
  if (dash !== null) return { ordered: false, text: dash[1] ?? "" };

  const numbered = /^\s*\d+[.)]\s+(.*)$/.exec(line);
  if (numbered !== null) return { ordered: true, text: numbered[1] ?? "" };

  return undefined;
}

/**
 * De tekens binnen één regel: `**vet**` en `*cursief*`. Eén doorloop en geen reeks `replace`-aanroepen.
 * Een teken dat niet wordt afgesloten blijft gewoon tekst.
 */
export function parseSpans(line: string): RichSpan[] {
  const spans: RichSpan[] = [];
  let plain = "";
  let index = 0;

  const flush = (): void => {
    if (plain !== "") spans.push({ text: plain });
    plain = "";
  };

  while (index < line.length) {
    const double = line.startsWith("**", index);
    const single = !double && line[index] === "*";

    if (double || single) {
      const marker = double ? "**" : "*";
      const close = line.indexOf(marker, index + marker.length);
      const inner = close === -1 ? "" : line.slice(index + marker.length, close);

      if (close === -1 || inner === "") {
        plain += marker;
        index += marker.length;
        continue;
      }

      flush();
      spans.push(double ? { text: inner, bold: true } : { text: inner, italic: true });
      index = close + marker.length;
      continue;
    }

    plain += line[index];
    index += 1;
  }

  flush();
  return spans;
}

/** De tekst als blokken. Regels binnen één alinea blijven aparte regels (`\n`), de weergave gebruikt `whitespace-pre-line`. */
export function parseRich(text: string): RichBlock[] {
  const blocks: RichBlock[] = [];
  let paragraph: string[] = [];
  let list: { ordered: boolean; items: RichSpan[][] } | undefined;

  const closeParagraph = (): void => {
    if (paragraph.length === 0) return;
    blocks.push({ kind: "paragraph", spans: parseSpans(paragraph.join("\n")) });
    paragraph = [];
  };

  const closeList = (): void => {
    if (list === undefined) return;
    blocks.push({ kind: "list", ordered: list.ordered, items: list.items });
    list = undefined;
  };

  for (const raw of text.replace(/\r\n/g, "\n").split("\n")) {
    const line = raw.trimEnd();
    const point = bullet(line);

    if (point !== undefined) {
      closeParagraph();
      if (list === undefined || list.ordered !== point.ordered) {
        closeList();
        list = { ordered: point.ordered, items: [] };
      }
      list.items.push(parseSpans(point.text));
      continue;
    }

    closeList();

    if (line.trim() === "") {
      closeParagraph();
      continue;
    }

    paragraph.push(line);
  }

  closeParagraph();
  closeList();
  return blocks;
}
