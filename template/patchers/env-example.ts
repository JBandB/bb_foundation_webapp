/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `.env.example`: per module een beheerd blok met de namen van de variabelen en hoe je eraan komt,
 * nooit een waarde (de huisregel env-template controleert dat). Daarbovenop één controle: een
 * variabele die ook los buiten de blokken staat, want dan staan er twee regels met dezelfde naam en
 * leest `vercel env pull` of een mens straks de verkeerde.
 */
import { HASH_BLOCKS, patchManagedBlocks, textOutsideBlocks, type BlockPatchResult, type ManagedBlock } from "./managed-blocks";

export const ENV_EXAMPLE_PREAMBLE = [
  "# Kopieer naar .env.local en vul in. Nooit echte waarden in dit bestand: het staat in git.",
  "# Hoe je aan elke waarde komt staat in docs/handleiding/06-variabelen-in-vercel.md.",
].join("\n");

export function patchEnvExample(text: string, blocks: readonly ManagedBlock[], previouslyManaged: readonly string[]): BlockPatchResult {
  const result = patchManagedBlocks(text, blocks, previouslyManaged, HASH_BLOCKS, { preamble: ENV_EXAMPLE_PREAMBLE });

  const inside = new Map<string, string>();
  for (const block of blocks) for (const name of variableNames(block.body)) inside.set(name, block.name);

  const warnings = [...result.warnings];
  for (const name of variableNames(textOutsideBlocks(result.text, HASH_BLOCKS))) {
    const block = inside.get(name);
    if (block !== undefined) {
      warnings.push(`${name} staat ook buiten het beheerde blok template:${block}; haal de losse regel weg, de regel in het blok is de bedoelde`);
    }
  }
  return { ...result, warnings };
}

/** De namen van de variabelen in een stuk .env-tekst. */
export function variableNames(text: string): string[] {
  return [...text.matchAll(/^([A-Z][A-Z0-9_]*)=/gm)].map((match) => match[1] ?? "");
}
