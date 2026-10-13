/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De paar git-opdrachten die de tooling nodig heeft, altijd via spawnSync met een argumentenlijst en
 * nooit via een shell: een spatie of een & in een pad doet dan niets, en een tag of URL kan geen
 * opdracht worden. Git zelf blijft van de mens; dit leest alleen, en kloont een versie naar een
 * tijdelijke map voor template:update.
 */
import { spawnSync } from "node:child_process";

export interface GitResult {
  readonly status: number;
  readonly stdout: string;
  readonly stderr: string;
}

export function runGit(args: readonly string[], cwd: string): GitResult {
  const result = spawnSync("git", [...args], { cwd, encoding: "utf8", shell: false });
  if (result.error !== undefined) {
    throw new Error(`git kon niet worden gestart (${result.error.message}); staat git op deze machine?`);
  }
  return { status: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}

export function isGitRepository(root: string): boolean {
  return runGit(["rev-parse", "--is-inside-work-tree"], root).status === 0;
}

/** Zijn er wijzigingen die nog niet gecommit zijn? Onbekende bestanden tellen mee. */
export function isWorkTreeDirty(root: string): boolean {
  const result = runGit(["status", "--porcelain"], root);
  if (result.status !== 0) throw new Error(`git status mislukte: ${result.stderr.trim()}`);
  return result.stdout.trim() !== "";
}

/** De tags uit de uitvoer van `git ls-remote --tags`, zonder de ^{}-verwijzingen. */
export function parseLsRemoteTags(stdout: string): string[] {
  const tags = new Set<string>();
  for (const line of stdout.split("\n")) {
    const match = /\trefs\/tags\/([^\s^]+)(\^\{\})?$/.exec(line.trim());
    if (match !== null && match[1] !== undefined) tags.add(match[1]);
  }
  return [...tags];
}

export function lsRemoteTags(url: string, cwd: string): string[] {
  const result = runGit(["ls-remote", "--tags", "--", url], cwd);
  if (result.status !== 0) {
    throw new Error(`De tags van ${url} konden niet worden opgehaald: ${result.stderr.trim() || "geen details"}. Heb je toegang tot de repo van het template?`);
  }
  return parseLsRemoteTags(result.stdout);
}

export function cloneTag(url: string, tag: string, destination: string, cwd: string): void {
  const result = runGit(["clone", "--quiet", "--depth", "1", "--branch", tag, "--", url, destination], cwd);
  if (result.status !== 0) {
    throw new Error(`Versie ${tag} van ${url} kon niet worden gekloond: ${result.stderr.trim() || "geen details"}`);
  }
}
