/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `.gitignore`: het template beheert zijn eigen blokken, het project houdt zijn eigen regels erbuiten.
 */
import { HASH_BLOCKS, patchManagedBlocks, type BlockPatchResult, type ManagedBlock } from "./managed-blocks";

export function patchGitignore(text: string, blocks: readonly ManagedBlock[], previouslyManaged: readonly string[]): BlockPatchResult {
  return patchManagedBlocks(text, blocks, previouslyManaged, HASH_BLOCKS);
}
