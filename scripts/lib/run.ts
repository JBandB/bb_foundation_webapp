/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Entrypoint voor de scripts.
 *
 * Bestaat om twee redenen. tsx compileert naar CommonJS en daar werkt top-level await niet, dus elk
 * script heeft een functie nodig om in te wonen. En een fout hoort als één nette regel op de console
 * te komen, niet als een stacktrace waarin de melding verdwijnt.
 */

export function runScript(fn: () => Promise<void>): void {
  fn().catch((error: unknown) => {
    console.error(`\nGestopt: ${error instanceof Error ? error.message : String(error)}`);
    process.exitCode = 1;
  });
}
