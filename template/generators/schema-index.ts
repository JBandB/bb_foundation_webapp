/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Schrijft lib/db/schema/template-index.ts: één `export *` per schemabestand van elke toegepaste
 * module, in de volgorde van toepassen. Het project exporteert dit bestand opnieuw in `index.ts` en
 * zet zijn eigen tabellen eronder.
 */

import { generatedHeaderLine } from "../lib/header";
import type { Manifest } from "../lib/manifest";

export function generateSchemaIndex(manifest: Manifest, applied: readonly string[]): string {
  const files = applied.flatMap((name) => manifest.modules[name]?.schemaFiles ?? []);

  return [
    generatedHeaderLine("lib/db/schema/template-index.ts", "schema-index") ?? "",
    "/**",
    " * De tabellen van de toegepaste modules van het template. Het project voegt zijn eigen tabellen toe",
    " * in `./index.ts`, dat dit bestand opnieuw exporteert.",
    " */",
    ...files.map((file) => `export * from "./${file}";`),
    "",
  ].join("\n");
}
