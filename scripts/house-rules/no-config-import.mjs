/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: `project.config.json` wordt nergens in de applicatie geïmporteerd.
 *
 * **Waarom.** Een JSON-import belandt integraal in de bundel, ook in die van de browser. De config
 * bevat straks namen van accounts en diensten (hosting, intake van de wizard) die daar niet horen,
 * ook al zijn het geen geheimen. De app leest alleen `lib/project/config.generated.ts`, dat de
 * generator schrijft met precies de velden die de app nodig heeft. Scripts en de template-tooling
 * mogen de config wel lezen; dat zijn geen bundels.
 */

import { lineAt } from "./files.mjs";

const SCOPES = ["app", "components", "lib"];

export function checkNoConfigImport(rel, text, report) {
  if (!/\.(ts|tsx|js|jsx|mjs)$/.test(rel)) return;
  if (!SCOPES.some((scope) => rel.startsWith(`${scope}/`))) return;

  const pattern = /(?:import[^;]*?from\s+|require\(|import\()\s*["'][^"']*project\.config\.json["']/g;
  for (const match of text.matchAll(pattern)) {
    report(
      `${rel}:${lineAt(text, match.index ?? 0)} importeert project.config.json; lees PROJECT uit lib/project/config.generated.ts, dat is wat de generator voor de app klaarzet`,
    );
  }
}
