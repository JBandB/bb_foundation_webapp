/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `template:verify`: bewijst in CI dat een project nog klopt met zijn lock. Geen enkel owned bestand
 * is gewijzigd, de gegenereerde bestanden zijn wat de generatoren uit de configuratie maken, de
 * gedeelde bestanden zijn een vast punt van hun patcher, en elk bestand draagt de kop die bij zijn
 * klasse hoort. Leest alleen.
 */

import { join } from "node:path";
import { generateAll } from "../generators";
import { patchClaudeMd } from "../patchers/claude-md";
import { patchEnvExample } from "../patchers/env-example";
import { patchGitignore } from "../patchers/gitignore";
import type { ManagedBlock } from "../patchers/managed-blocks";
import { patchPackageJson } from "../patchers/package-json";
import { patchVercelJson } from "../patchers/vercel-json";
import { readConfig } from "./config";
import { commentStyleFor, readHeader } from "./header";
import { fileExists, isBinaryPath, readBytes, readText } from "./files";
import { hashBytes, hashText, LOCK_FILE, readLock } from "./lock";
import { appliedModules, loadManifest } from "./manifest";

export interface VerifyResult {
  readonly problems: readonly string[];
  readonly checked: number;
}

export function verifyProject(root: string): VerifyResult {
  const problems: string[] = [];
  let checked = 0;

  const manifest = loadManifest(root);
  const lock = readLock(root);
  if (lock === undefined) {
    return { problems: [`${LOCK_FILE} ontbreekt. Draai pnpm template:apply.`], checked: 0 };
  }
  if (lock.version !== manifest.version) {
    problems.push(`De lock zegt template ${lock.version}, het manifest zegt ${manifest.version}. Draai pnpm template:apply.`);
  }

  const report = readConfig(root, manifest);
  if (report.config === undefined) {
    problems.push(...report.errors.map((problem) => `project.config.json ${problem.path}: ${problem.message}`));
    return { problems, checked };
  }
  const config = report.config;

  const generated = new Map(generateAll(config, manifest).map((file) => [file.path, file.content]));

  for (const [path, entry] of Object.entries(lock.files)) {
    checked += 1;
    const target = join(root, path);
    if (!fileExists(target)) {
      problems.push(`${path} ontbreekt (${entry.class}, module ${entry.module}). Draai pnpm template:apply om het terug te zetten.`);
      continue;
    }
    const currentHash = isBinaryPath(path) ? hashBytes(readBytes(target)) : hashText(readText(target));

    if (entry.class === "owned" || entry.class === "generated") {
      if (currentHash !== entry.hash) {
        problems.push(`${path} is gewijzigd terwijl het van het template is. Zet het terug met pnpm template:apply --force, of maak het van het project met pnpm template:adopt ${path}.`);
      }
      if (entry.class === "generated") {
        const expected = generated.get(path);
        if (expected !== undefined && hashText(expected) !== currentHash) {
          problems.push(`${path} is verouderd ten opzichte van project.config.json. Draai pnpm template:generate.`);
        }
      }
      if (!isBinaryPath(path) && commentStyleFor(path) !== undefined && !path.startsWith("template/modules/")) {
        const header = readHeader(readText(target));
        if (entry.class === "owned" && (header?.kind !== "owned" || (!path.startsWith("template/") && header.module !== entry.module))) {
          problems.push(`${path} mist de kop template-owned (module ${entry.module}).`);
        }
        if (entry.class === "generated" && header?.kind !== "generated") problems.push(`${path} mist de kop template-generated.`);
      }
    }
  }

  for (const path of lock.adopted) {
    checked += 1;
    const target = join(root, path);
    if (!fileExists(target)) continue;
    if (!isBinaryPath(path) && commentStyleFor(path) !== undefined) {
      const header = readHeader(readText(target));
      if (header !== undefined && header.kind !== "adopted") problems.push(`${path} is overgenomen door het project maar draagt nog de kop van het template. Draai pnpm template:adopt ${path} opnieuw.`);
    }
  }

  /* De gedeelde bestanden: elke patcher moet een vast punt zijn. */
  const active = appliedModules(manifest, config.modules).filter((name) => manifest.modules[name]?.status === null);
  const blocksFor = (key: "envExample" | "claudeMd" | "gitignore"): ManagedBlock[] =>
    active.flatMap((name) => {
      const path = manifest.modules[name]?.merge[key];
      return path === null || path === undefined ? [] : [{ name, body: readText(join(root, path)) }];
    });
  const text = (file: string): string => (fileExists(join(root, file)) ? readText(join(root, file)) : "");

  const packageParts = active.map((name) => manifest.modules[name]?.merge.packageJson).filter((part) => part !== undefined);
  const packageResult = patchPackageJson(
    text("package.json"),
    {
      packageManager: packageParts.map((part) => part.packageManager).find((value) => value !== null) ?? "",
      engines: Object.assign({}, ...packageParts.map((part) => part.engines)) as Record<string, string>,
      scripts: Object.assign({}, ...packageParts.map((part) => part.scripts)) as Record<string, string>,
      dependencies: Object.assign({}, ...packageParts.map((part) => part.dependencies)) as Record<string, string>,
      devDependencies: Object.assign({}, ...packageParts.map((part) => part.devDependencies)) as Record<string, string>,
    },
    lock.merged.packageJson,
    { skipDependencies: [...config.template.skipDependencies], name: config.project.slug },
  );
  checked += 1;
  for (const change of packageResult.changes) problems.push(`package.json: ${change} (draai pnpm template:apply)`);

  const crons = active.flatMap((name) => manifest.modules[name]?.merge.vercelJson.crons ?? []);
  const vercelResult = patchVercelJson(text("vercel.json"), { defaults: { regions: [config.hosting.region] }, crons }, lock.merged.vercelCrons, [...config.template.keepCrons]);
  checked += 1;
  for (const change of vercelResult.changes) problems.push(`vercel.json: ${change} (draai pnpm template:apply)`);

  for (const [file, result] of [
    [".env.example", patchEnvExample(text(".env.example"), blocksFor("envExample"), lock.merged.envBlocks)],
    ["CLAUDE.md", patchClaudeMd(text("CLAUDE.md"), blocksFor("claudeMd"), lock.merged.claudeBlocks)],
    [".gitignore", patchGitignore(text(".gitignore"), blocksFor("gitignore"), lock.merged.gitignoreBlocks)],
  ] as const) {
    checked += 1;
    for (const change of result.changes) problems.push(`${file}: ${change} (draai pnpm template:apply)`);
  }

  return { problems, checked };
}
