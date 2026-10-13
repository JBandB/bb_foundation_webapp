/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: kleuren komen uit de tokens. Zie CLAUDE.md en docs/THEME.md.
 *
 * Drie uitzonderingen, en niet meer:
 *
 *   app/theme.css         gegenereerd uit project.config.json; daar wonen de tokens
 *   app/project.css       eigen tokens en overrides van het project
 *   lib/brand/tokens.ts   voor plekken die geen CSS-variabele kunnen lezen, zoals de
 *                         theme-color van de browser en de opmaak van een mail
 *
 * De tweede regel in dit bestand controleert dat tokens.ts en de twee CSS-bestanden niet uit elkaar
 * gaan lopen, want twee waarheden over de huisstijl is erger dan één hardcoded hex.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { lineAt } from "./files.mjs";

/** Alleen applicatiecode. Scripts en docs mogen een kleur noemen. */
const SCOPES = ["app", "components", "lib"];

const ALLOWED = new Set(["app/theme.css", "app/project.css", "lib/brand/tokens.ts"]);

const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const COLOUR_FUNCTION = /\b(?:rgb|rgba|hsl|hsla|oklch|lab)\(/g;

function inScope(rel) {
  if (!/\.(ts|tsx|js|jsx|css)$/.test(rel)) return false;
  return SCOPES.some((scope) => rel === scope || rel.startsWith(`${scope}/`));
}

export function checkNoHardcodedColour(rel, text, report) {
  if (ALLOWED.has(rel) || !inScope(rel)) return;

  for (const [pattern, description] of [
    [HEX, "hardcoded hexkleur"],
    [COLOUR_FUNCTION, "hardcoded kleurfunctie"],
  ]) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      report(
        `${rel}:${lineAt(text, match.index)} ${description} "${match[0]}", gebruik een token uit app/theme.css of app/project.css (docs/THEME.md)`,
      );
    }
  }
}

/** Elke kleur in lib/brand/tokens.ts moet ook in theme.css of project.css staan. */
export function checkTokenDrift(root, report) {
  const tokens = readFileSync(join(root, "lib/brand/tokens.ts"), "utf8");
  const css = ["app/theme.css", "app/project.css"]
    .map((rel) => join(root, rel))
    .filter((path) => existsSync(path))
    .map((path) => readFileSync(path, "utf8").toLowerCase())
    .join("\n");

  for (const hex of tokens.match(HEX) ?? []) {
    if (!css.includes(hex.toLowerCase())) {
      report(
        `lib/brand/tokens.ts kleur ${hex} staat niet in app/theme.css of app/project.css, de huisstijl heeft nu twee waarheden`,
      );
    }
  }
}
