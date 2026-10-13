/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `CLAUDE.md`: de regels van het template staan in blokken per module, de tekst van het project
 * eromheen. Nieuwe blokken komen vóór het blok dat `next dev` zelf onderaan schrijft
 * (`nextjs-agent-rules`), zodat dat blok onderaan blijft en de regels van het template bij elkaar.
 */
import { HTML_BLOCKS, patchManagedBlocks, type BlockPatchResult, type ManagedBlock } from "./managed-blocks";

export const CLAUDE_MD_PREAMBLE = [
  "# CLAUDE.md",
  "",
  "<!-- Het projectblok: wat dit project is in één zin en wie beslist. Zie docs/WERKWIJZE.md. -->",
].join("\n");

const NEXT_AGENT_RULES = /^<!-- BEGIN:nextjs-agent-rules -->/;

export function patchClaudeMd(text: string, blocks: readonly ManagedBlock[], previouslyManaged: readonly string[]): BlockPatchResult {
  return patchManagedBlocks(text, blocks, previouslyManaged, HTML_BLOCKS, { insertBefore: NEXT_AGENT_RULES, preamble: CLAUDE_MD_PREAMBLE });
}
