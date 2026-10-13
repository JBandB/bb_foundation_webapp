/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De kopregel die zegt van wie een bestand is. Hij staat op regel 1, of op regel 2 na een shebang,
 * in de commentaarvorm van het bestandstype. Een bestand zonder commentaarvorm (JSON zonder
 * commentaar, een binair bestand) heeft geen kop; daar is de lock de enige administratie.
 *
 *   template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet.
 *   template-generated (theme) uit project.config.json. Niet bewerken: pnpm template:generate schrijft hem opnieuw.
 */
import { basename, extname } from "node:path";

export type HeaderInfo =
  | { readonly kind: "owned"; readonly module: string }
  | { readonly kind: "generated"; readonly generator: string }
  | { readonly kind: "adopted"; readonly module: string };

interface CommentStyle {
  readonly open: string;
  readonly close: string;
}

const SLASH_STAR: CommentStyle = { open: "/* ", close: " */" };
const DOUBLE_SLASH: CommentStyle = { open: "// ", close: "" };
const DASHES: CommentStyle = { open: "-- ", close: "" };
const HTML: CommentStyle = { open: "<!-- ", close: " -->" };
const HASH: CommentStyle = { open: "# ", close: "" };

/** De commentaarvorm van een bestand, of undefined als het type er geen heeft. */
export function commentStyleFor(path: string): CommentStyle | undefined {
  const name = basename(path);
  if (/^tsconfig.*\.json$/.test(name)) return DOUBLE_SLASH;
  if (path.includes(".githooks/")) return HASH;
  if (name.startsWith(".env")) return HASH;
  if (name.startsWith(".") && !name.slice(1).includes(".")) return HASH;
  switch (extname(name).toLowerCase()) {
    case ".ts":
    case ".tsx":
    case ".mts":
    case ".cts":
    case ".js":
    case ".mjs":
    case ".cjs":
    case ".css":
      return SLASH_STAR;
    case ".sql":
      return DASHES;
    case ".md":
    case ".mdx":
    case ".html":
      return HTML;
    case ".yml":
    case ".yaml":
    case ".toml":
    case ".sh":
      return HASH;
    default:
      return undefined;
  }
}

export function ownedHeaderLine(path: string, module: string): string | undefined {
  const style = commentStyleFor(path);
  if (style === undefined) return undefined;
  return `${style.open}template-owned (module ${module}). Wordt overschreven door pnpm template:update; wijzig dit bestand niet.${style.close}`;
}

export function generatedHeaderLine(path: string, generator: string): string | undefined {
  const style = commentStyleFor(path);
  if (style === undefined) return undefined;
  return `${style.open}template-generated (${generator}) uit project.config.json. Niet bewerken: pnpm template:generate schrijft hem opnieuw.${style.close}`;
}

/** De kop van een bestand dat het project met template:adopt heeft overgenomen. */
export function adoptedHeaderLine(path: string, module: string, version: string): string | undefined {
  const style = commentStyleFor(path);
  if (style === undefined) return undefined;
  return `${style.open}template-adopted (module ${module}). Van het project sinds template ${version}; pnpm template:update raakt dit bestand niet meer aan.${style.close}`;
}

const HEADER = /template-(owned|generated|adopted) \(([^)]*)\)/;

/** Op welke regel de kop staat of hoort: regel 1, of regel 2 na een shebang of een HTML-doctype. */
function headerIndex(lines: readonly string[]): number {
  const first = (lines[0] ?? "").trim();
  return first.startsWith("#!") || /^<!doctype\s/i.test(first) ? 1 : 0;
}

/** Leest de kop van een bestand; undefined als die er niet is. */
export function readHeader(text: string): HeaderInfo | undefined {
  const lines = text.split("\n");
  const line = lines[headerIndex(lines)] ?? "";
  const match = HEADER.exec(line);
  if (match === null) return undefined;
  if (match[1] === "owned" || match[1] === "adopted") {
    const named = /^module (\S+)$/.exec(match[2] ?? "");
    if (named === null) return undefined;
    return match[1] === "owned" ? { kind: "owned", module: named[1] ?? "" } : { kind: "adopted", module: named[1] ?? "" };
  }
  return { kind: "generated", generator: match[2] ?? "" };
}

/** Zet de kop op zijn plek: vervangt een bestaande kop, of voegt hem in na een eventuele shebang. */
export function withHeader(text: string, header: string): string {
  const lines = text.split("\n");
  const index = headerIndex(lines);
  if (HEADER.test(lines[index] ?? "")) lines[index] = header;
  else lines.splice(index, 0, header);
  return lines.join("\n");
}
