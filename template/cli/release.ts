/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/** `pnpm template:release X.Y.Z`, alleen in de templaterepo. */
import { prepareRelease, ReleaseError } from "../lib/release";
import { runApply } from "./apply";

export function runRelease(root: string, args: readonly string[]): number {
  const requested = args.find((argument) => !argument.startsWith("--"));
  if (requested === undefined) {
    console.error("Gebruik: pnpm template:release X.Y.Z");
    return 1;
  }

  let result;
  try {
    result = prepareRelease(root, requested);
  } catch (error) {
    if (error instanceof ReleaseError) {
      console.error(error.message);
      return 1;
    }
    throw error;
  }

  console.log(`Manifest: ${result.from} wordt ${result.to}. CHANGELOG: "Nog niet uitgebracht" is nu v${result.to} (${result.dateText}).\n`);
  const status = runApply(root, ["--allow-dirty"]);
  if (status !== 0) return status;

  console.log("\nWat je nu doet:");
  console.log(`  1. Lees template/CHANGELOG.md na onder v${result.to}: kloppen "Let op bij bijwerken" en het handwerk?`);
  console.log("  2. Draai de batterij: pnpm typecheck && pnpm lint && pnpm test && pnpm template:verify, en de gouden test: node template/ci/golden.mjs voorbeeld");
  console.log(`  3. Commit alles met de boodschap "Release v${result.to}", zet de tag v${result.to} en push de tag. Projecten halen hem op met pnpm template:update.`);
  return 0;
}
