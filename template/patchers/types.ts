/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */

/**
 * Wat elke patcher teruggeeft. Een patcher is een pure functie van tekst naar tekst: hij leest en
 * schrijft zelf niets, zodat hij in een test twee keer achter elkaar kan draaien en het bewijs van
 * idempotentie (`patch(patch(x)) === patch(x)`) een gewone assert is.
 */
export interface PatchResult {
  readonly text: string;
  /** Wat er veranderd is, in gewone taal en zonder bestandsnaam; de aanroeper zet die ervoor. */
  readonly changes: readonly string[];
  /** Wat de mens moet weten zonder dat het de patch tegenhoudt. */
  readonly warnings: readonly string[];
}
