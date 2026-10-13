/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm template:update [--to X.Y.Z] [--from <map>] [--force] [--strict] [--dry-run] [--allow-dirty]`.
 * Haalt de nieuwe versie op, laat háár tooling apply draaien op dit project, en toont daarna wat er
 * tussen de oude en de nieuwe versie veranderde.
 */
import { changesBetween, planUpdate, runHandoff, UpdateError } from "../lib/update";

export function runUpdate(root: string, args: readonly string[]): number {
  const options = parseArgs(args);
  if (options.unknown.length > 0) {
    console.error(`Onbekende optie: ${options.unknown.join(", ")}. Bekend: --to, --from, --force, --strict, --dry-run, --allow-dirty.`);
    return 1;
  }

  let plan;
  try {
    plan = planUpdate(root, { to: options.to, from: options.from });
  } catch (error) {
    if (error instanceof UpdateError) {
      console.error(error.message);
      return 1;
    }
    throw error;
  }

  if (plan.sourceDir === "") {
    console.log(`Dit project staat al op template ${plan.fromVersion}; nieuwer is er niet${plan.tag === null ? "" : ` (laatste tag ${plan.tag})`}.`);
    return 0;
  }

  try {
    console.log(`Bijwerken van template ${plan.fromVersion} naar ${plan.toVersion}${plan.tag === null ? ` uit ${plan.sourceDir}` : ` (${plan.tag})`}.\n`);
    const status = runHandoff(root, plan.sourceDir, options.passthrough);
    if (status !== 0) {
      console.error(`\nHet bijwerken is niet afgemaakt (exitcode ${status}). De lock zegt nog ${plan.fromVersion}; los het bovenstaande op en draai pnpm template:update opnieuw.`);
      return status;
    }
    const changes = changesBetween(plan.sourceDir, plan.fromVersion, plan.toVersion);
    if (changes !== "") console.log(`\nWat er veranderde tussen ${plan.fromVersion} en ${plan.toVersion}:\n\n${changes}\n`);
    return 0;
  } finally {
    plan.cleanup();
  }
}

function parseArgs(args: readonly string[]): { to: string | undefined; from: string | undefined; passthrough: string[]; unknown: string[] } {
  let to: string | undefined;
  let from: string | undefined;
  const passthrough: string[] = [];
  const unknown: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index] ?? "";
    const [flag, inlineValue] = argument.includes("=") ? [argument.slice(0, argument.indexOf("=")), argument.slice(argument.indexOf("=") + 1)] : [argument, undefined];
    const value = (): string | undefined => {
      if (inlineValue !== undefined) return inlineValue;
      index += 1;
      return args[index];
    };
    if (flag === "--to") to = value()?.replace(/^v/, "");
    else if (flag === "--from") from = value();
    else if (["--force", "--strict", "--dry-run", "--allow-dirty"].includes(flag)) passthrough.push(flag);
    else unknown.push(argument);
  }
  return { to, from, passthrough, unknown };
}
