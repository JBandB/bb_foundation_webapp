/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `template:status`: hoe staat het template in dit project. Leest alleen.
 */

import { join } from "node:path";
import { configsEqual, readDefaultConfig } from "./apply";
import { readConfig } from "./config";
import { fileExists, isBinaryPath, readBytes, readText } from "./files";
import { hashBytes, hashText, readLock, type Lock } from "./lock";
import { loadManifest, sourceOf, type Manifest } from "./manifest";

export interface StatusReport {
  readonly manifestVersion: string;
  readonly lock: Lock | undefined;
  readonly modules: readonly string[];
  readonly skippedModules: readonly string[];
  readonly unchanged: readonly string[];
  readonly changed: readonly string[];
  readonly missing: readonly string[];
  readonly adopted: readonly string[];
  readonly seeds: readonly string[];
  readonly seedsWithNewerSource: readonly string[];
  readonly onDefaultConfig: boolean;
  readonly configProblems: readonly string[];
}

export function statusReport(root: string): StatusReport {
  const manifest: Manifest = loadManifest(root);
  const lock = readLock(root);
  const report = readConfig(root, manifest);
  const configProblems = report.errors.map((problem) => `${problem.path}: ${problem.message}`);
  const modules = report.config === undefined ? [] : ["core", ...report.config.modules];
  const skippedModules = modules.filter((name) => manifest.modules[name]?.status !== null && manifest.modules[name]?.status !== undefined);

  const unchanged: string[] = [];
  const changed: string[] = [];
  const missing: string[] = [];
  const seeds: string[] = [];
  const seedsWithNewerSource: string[] = [];

  for (const [path, entry] of Object.entries(lock?.files ?? {})) {
    const target = join(root, path);
    if (!fileExists(target)) {
      missing.push(path);
      continue;
    }
    const currentHash = isBinaryPath(path) ? hashBytes(readBytes(target)) : hashText(readText(target));
    if (entry.class === "seed") {
      seeds.push(path);
      const moduleManifest = manifest.modules[entry.module];
      const fileEntry = moduleManifest?.files.find((candidate) => candidate.to === path);
      if (moduleManifest !== undefined && fileEntry !== undefined && entry.sourceHash !== null) {
        const source = sourceOf(entry.module, moduleManifest, fileEntry);
        /* Een seed van een inRoot-module is zijn eigen bron; die vergelijking zegt niets. */
        if (source !== path) {
          const sourcePath = join(root, source);
          if (fileExists(sourcePath) && hashText(readText(sourcePath)) !== entry.sourceHash) seedsWithNewerSource.push(path);
        }
      }
      continue;
    }
    (currentHash === entry.hash ? unchanged : changed).push(path);
  }

  const onDefaultConfig = report.config !== undefined && configsEqual(report.config, readDefaultConfig(root, manifest));

  return {
    manifestVersion: manifest.version,
    lock,
    modules,
    skippedModules,
    unchanged,
    changed,
    missing,
    adopted: lock?.adopted ?? [],
    seeds,
    seedsWithNewerSource,
    onDefaultConfig,
    configProblems,
  };
}
