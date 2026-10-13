/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/** `pnpm template:add <module> [<module> ...] [--dry-run] [--force] [--strict] [--allow-dirty]`: in de configuratie zetten en toepassen. */
import { AddError, addModules } from "../lib/add";
import { loadManifest } from "../lib/manifest";
import { runApply } from "./apply";

export function runAdd(root: string, args: readonly string[]): number {
  const names = args.filter((argument) => !argument.startsWith("--"));
  const flags = args.filter((argument) => argument.startsWith("--"));
  if (names.length === 0) {
    console.error("Gebruik: pnpm template:add <module> [<module> ...]");
    return 1;
  }

  let result;
  try {
    result = addModules(root, loadManifest(root), names);
  } catch (error) {
    if (error instanceof AddError) {
      console.error(error.message);
      return 1;
    }
    throw error;
  }

  if (result.added.length > 0) console.log(`Toegevoegd aan project.config.json: ${result.added.join(", ")}.`);
  if (result.alreadyPresent.length > 0) console.log(`Stond er al: ${result.alreadyPresent.join(", ")}.`);
  if (result.planned.length > 0) console.log(`Nog niet beschikbaar in deze versie, apply slaat ze over: ${result.planned.join(", ")}.`);
  console.log("");
  /* Een module erbij maakt de werkmap per definitie vuil (de configuratie), dus apply mag dat hier zien. */
  return runApply(root, flags.includes("--allow-dirty") ? flags : [...flags, "--allow-dirty"]);
}
