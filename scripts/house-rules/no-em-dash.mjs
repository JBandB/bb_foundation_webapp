/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: geen em-dashes, nergens. Zie CLAUDE.md.
 *
 * Deze regel bestaat naast de ESLint-variant omdat ESLint alleen naar code
 * kijkt, en een em-dash net zo makkelijk in een markdownbestand, een
 * migratiecommentaar of een workflow belandt.
 */

import { lineAt } from "./files.mjs";

/**
 * Opgebouwd uit het codepoint, zodat dit bestand zelf geen em-dash bevat en de
 * regel dus ook op zichzelf van toepassing blijft.
 */
const EM_DASH = String.fromCodePoint(0x2014);

/**
 * Blokken die door een tool worden geschreven en teruggezet zodra je ze
 * weghaalt. `next dev` doet dit met CLAUDE.md. Repareren heeft geen zin, dus
 * vallen ze buiten de controle. Eigen tekst eromheen valt er wel binnen.
 */
const GENERATED_BLOCKS = [
  /<!-- BEGIN:nextjs-agent-rules -->[\s\S]*?<!-- END:nextjs-agent-rules -->/g,
];

/** Regels die de huisregel citeren mogen het teken bevatten. */
const QUOTES_THE_RULE = "Nooit em-dashes";

export function checkNoEmDash(rel, text, report) {
  // Gegenereerde blokken vervangen door spaties, zodat regelnummers blijven kloppen.
  let scanned = text;
  for (const block of GENERATED_BLOCKS) {
    scanned = scanned.replace(block, (match) => match.replace(/[^\n]/g, " "));
  }

  const lines = scanned.split("\n");
  const pattern = new RegExp(EM_DASH, "g");
  let match;

  while ((match = pattern.exec(scanned)) !== null) {
    const line = lineAt(scanned, match.index);
    if ((lines[line - 1] ?? "").includes(QUOTES_THE_RULE)) continue;

    report(
      `${rel}:${line} em-dash gevonden, gebruik een komma, dubbele punt, haakjes of een nieuwe zin`,
    );
  }
}
