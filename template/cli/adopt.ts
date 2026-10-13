/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/** `pnpm template:adopt <pad> [--remove]`. */
import { adoptFile } from "../lib/adopt";

export function runAdopt(root: string, args: readonly string[]): number {
  const path = args.find((arg) => !arg.startsWith("--"));
  if (path === undefined) {
    console.error("Gebruik: pnpm template:adopt <pad> [--remove]");
    return 1;
  }
  const result = adoptFile(root, path.replace(/\\/g, "/"), { remove: args.includes("--remove") });
  if (result.removed) {
    console.log(`${result.path} is verwijderd (kopie in .template-backup/) en komt bij een update niet terug.`);
  } else {
    console.log(`${result.path} is nu van het project${result.headerChanged ? ", met de kop template-adopted" : ""}. Het template schrijft het niet meer; de lock is bijgewerkt.`);
  }
  return 0;
}
