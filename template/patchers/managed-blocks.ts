/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Beheerde blokken in een tekstbestand dat verder van het project is: CLAUDE.md, .gitignore en
 * .env.example. Elk blok hoort bij een module en staat tussen een begin- en een eindmarker; wat
 * buiten de markers staat raakt de patcher niet aan.
 *
 * De regels, en waarom:
 *
 * - Een bestaand blok wordt op zijn plek vervangen, een nieuw blok komt erachter (of vóór een anker,
 *   zoals het blok dat `next dev` zelf in CLAUDE.md schrijft). Zo blijft de volgorde die de mens koos.
 * - Een blok dat eerder van het template was en nu niet meer in het manifest staat, verdwijnt. Een
 *   blok met markers dat het template niet kent, blijft staan met een waarschuwing: misschien van een
 *   module die nog niet is toegepast, misschien een vergissing, en in beide gevallen beslist de mens.
 * - Rond een blok staat precies één lege regel, en het bestand eindigt op één regeleinde. Daardoor
 *   stapelt herhalen geen witregels, en is de tweede keer draaien een no-op.
 * - Een blok zonder eindmarker is een kapot bestand. De patcher gooit dan en de mens herstelt het,
 *   want raden waar het blok eindigt kan projecttekst wissen.
 */
import { normaliseNewlines } from "../lib/lock";
import type { PatchResult } from "./types";

export interface BlockStyle {
  readonly begin: (name: string) => string;
  readonly end: (name: string) => string;
  /** Herkent een beginregel en vangt de naam in groep 1. */
  readonly beginPattern: RegExp;
  readonly endPattern: RegExp;
}

export const HTML_BLOCKS: BlockStyle = {
  begin: (name) => `<!-- template:begin ${name} -->`,
  end: (name) => `<!-- template:end ${name} -->`,
  beginPattern: /^<!-- template:begin (\S+) -->\s*$/,
  endPattern: /^<!-- template:end (\S+) -->\s*$/,
};

export const HASH_BLOCKS: BlockStyle = {
  begin: (name) => `# >>> template:${name} (beheerd blok, wordt bijgewerkt door pnpm template:update)`,
  end: (name) => `# <<< template:${name}`,
  beginPattern: /^# >>> template:(\S+)(?:\s.*)?$/,
  endPattern: /^# <<< template:(\S+)\s*$/,
};

export interface ManagedBlock {
  readonly name: string;
  readonly body: string;
}

export interface BlockPatchOptions {
  /** Nieuwe blokken komen vóór de eerste regel die hierop past, in plaats van aan het eind. */
  readonly insertBefore?: RegExp;
  /** De inhoud van een bestand dat nog niet bestaat, vóór de blokken. */
  readonly preamble?: string;
}

export interface BlockPatchResult extends PatchResult {
  /** De namen die het template nu beheert, voor de lock. */
  readonly managed: readonly string[];
}

type Segment = { readonly kind: "text"; readonly lines: string[] } | { readonly kind: "block"; readonly name: string; readonly lines: string[] };

export function patchManagedBlocks(
  text: string,
  desired: readonly ManagedBlock[],
  previouslyManaged: readonly string[],
  style: BlockStyle,
  options: BlockPatchOptions = {},
): BlockPatchResult {
  const changes: string[] = [];
  const warnings: string[] = [];
  const source = text.trim() === "" && options.preamble !== undefined ? options.preamble : text;
  const segments = parseSegments(normaliseNewlines(source), style);

  const result: Segment[] = [];
  for (const segment of segments) {
    if (segment.kind === "text") {
      result.push(segment);
      continue;
    }
    const wanted = desired.find((block) => block.name === segment.name);
    if (wanted !== undefined) {
      const rendered = renderBlock(wanted, style);
      if (rendered.join("\n") !== segment.lines.join("\n")) changes.push(`blok ${segment.name} bijgewerkt`);
      result.push({ kind: "block", name: segment.name, lines: rendered });
    } else if (previouslyManaged.includes(segment.name)) {
      changes.push(`blok ${segment.name} verwijderd (niet meer in het template)`);
    } else {
      warnings.push(`blok ${segment.name} hoort bij geen toegepaste module en is met rust gelaten`);
      result.push(segment);
    }
  }

  const present = new Set(result.flatMap((segment) => (segment.kind === "block" ? [segment.name] : [])));
  const additions: Segment[] = desired
    .filter((block) => !present.has(block.name))
    .map((block) => ({ kind: "block", name: block.name, lines: renderBlock(block, style) }));
  for (const addition of additions) if (addition.kind === "block") changes.push(`blok ${addition.name} toegevoegd`);
  insertSegments(result, additions, options.insertBefore);

  return { text: serialise(result), changes, warnings, managed: desired.map((block) => block.name) };
}

/** De tekst buiten de blokken, voor controles zoals een variabele die ook los in .env.example staat. */
export function textOutsideBlocks(text: string, style: BlockStyle): string {
  return parseSegments(normaliseNewlines(text), style)
    .flatMap((segment) => (segment.kind === "text" ? segment.lines : []))
    .join("\n");
}

function parseSegments(text: string, style: BlockStyle): Segment[] {
  const lines = text === "" ? [] : text.split("\n");
  const segments: Segment[] = [];
  let current: string[] = [];
  let index = 0;
  while (index < lines.length) {
    const line = lines[index] ?? "";
    const begin = style.beginPattern.exec(line);
    if (begin === null) {
      current.push(line);
      index += 1;
      continue;
    }
    if (current.length > 0) segments.push({ kind: "text", lines: current });
    current = [];
    const name = begin[1] ?? "";
    const block = [line];
    index += 1;
    for (;;) {
      const inner = lines[index];
      if (inner === undefined) {
        throw new Error(`blok ${name} heeft geen eindmarker (${style.end(name)}); herstel het bestand eerst`);
      }
      block.push(inner);
      index += 1;
      const end = style.endPattern.exec(inner);
      if (end !== null) {
        if (end[1] !== name) throw new Error(`blok ${name} wordt gesloten door de eindmarker van ${end[1] ?? ""}; herstel het bestand eerst`);
        break;
      }
      if (style.beginPattern.test(inner)) throw new Error(`blok ${name} bevat een tweede beginmarker; herstel het bestand eerst`);
    }
    segments.push({ kind: "block", name, lines: block });
  }
  if (current.length > 0) segments.push({ kind: "text", lines: current });
  return segments;
}

function renderBlock(block: ManagedBlock, style: BlockStyle): string[] {
  const body = normaliseNewlines(block.body).replace(/^\n+/, "").replace(/\s+$/, "");
  return [style.begin(block.name), ...(body === "" ? [] : body.split("\n")), style.end(block.name)];
}

function insertSegments(target: Segment[], additions: readonly Segment[], anchor: RegExp | undefined): void {
  if (additions.length === 0) return;
  if (anchor !== undefined) {
    for (let index = 0; index < target.length; index += 1) {
      const segment = target[index];
      if (segment === undefined || segment.kind !== "block") {
        const lines = segment?.lines ?? [];
        const at = lines.findIndex((line) => anchor.test(line));
        if (at !== -1) {
          target.splice(index, 1, { kind: "text", lines: lines.slice(0, at) }, ...additions, { kind: "text", lines: lines.slice(at) });
          return;
        }
      }
    }
  }
  target.push(...additions);
}

function serialise(segments: readonly Segment[]): string {
  const parts = segments
    .map((segment) => (segment.kind === "text" ? trimBlankEdges(segment.lines).join("\n") : segment.lines.join("\n")))
    .filter((part) => part !== "");
  return parts.length === 0 ? "" : `${parts.join("\n\n")}\n`;
}

function trimBlankEdges(lines: readonly string[]): string[] {
  let start = 0;
  let end = lines.length;
  while (start < end && (lines[start] ?? "").trim() === "") start += 1;
  while (end > start && (lines[end - 1] ?? "").trim() === "") end -= 1;
  return lines.slice(start, end);
}
