/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: geen labelbestand boven de zeshonderd regels.
 *
 * **Waarom.** In een eerder project groeide het ene labelbestand naar ruim vierduizend regels met
 * vierenzestig groepen, geïmporteerd door tweehonderd bestanden. Elke wijziging raakte dat bestand,
 * elke merge botste erin, en niemand kon nog zien welke teksten bij welk scherm hoorden. De remedie
 * is eenvoudig en moet mechanisch zijn, anders gebeurt hij niet: één bestand per domein onder
 * `lib/i18n/domain/`, samengesteld in `lib/i18n/labels.ts`. Zie lib/i18n/domain/README.md.
 */

const LIMIT = 600;

export function checkLabelsSize(rel, text, report) {
  if (!rel.startsWith("lib/i18n/") || !rel.endsWith(".ts") || rel.endsWith(".test.ts")) return;
  const lines = text.split("\n").length;
  if (lines <= LIMIT) return;
  report(
    `${rel} heeft ${lines} regels en de grens is ${LIMIT}. Splits de teksten per domein in lib/i18n/domain/ en stel ze samen in labels.ts, zie lib/i18n/domain/README.md`,
  );
}
