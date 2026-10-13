/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Alle gegenereerde bestanden in één lijst, berekend uit de configuratie en het manifest. Apply,
 * `template:generate` en de zelftest gebruiken dezelfde functie, zodat "gegenereerd" overal hetzelfde
 * betekent.
 */

import { join } from "node:path";
import type { ProjectConfig } from "../lib/config-schema";
import { fileExists, readText, writeText } from "../lib/files";
import { appliedModules, type GeneratorName, type Manifest } from "../lib/manifest";
import { generateProject } from "./project";
import { generateModuleLabels, generateRegistry, generateUiRegistry } from "./registry";
import { generateRoles } from "./roles";
import { generateSchemaIndex } from "./schema-index";
import { generateTheme } from "./theme";
import { generateTokens } from "./tokens";

export interface GeneratedFile {
  readonly path: string;
  readonly generator: GeneratorName;
  readonly content: string;
}

export function generateAll(config: ProjectConfig, manifest: Manifest): GeneratedFile[] {
  const applied = appliedModules(manifest, config.modules);
  const theme = generateTheme(config);

  return [
    { path: "app/theme.css", generator: "theme", content: theme.css },
    { path: "lib/brand/tokens.ts", generator: "tokens", content: generateTokens(theme.light) },
    { path: "lib/project/config.generated.ts", generator: "project", content: generateProject(config) },
    { path: "lib/auth/roles.generated.ts", generator: "roles", content: generateRoles(config) },
    { path: "lib/db/schema/template-index.ts", generator: "schema-index", content: generateSchemaIndex(manifest, applied) },
    { path: "lib/project/registry.generated.ts", generator: "registry", content: generateRegistry(manifest, applied) },
    { path: "lib/project/ui-registry.generated.ts", generator: "registry", content: generateUiRegistry(manifest, applied) },
    { path: "lib/i18n/template/modules.generated.ts", generator: "labels", content: generateModuleLabels(manifest, applied) },
  ];
}

export interface WriteResult {
  readonly written: string[];
  readonly unchanged: string[];
}

/** Schrijft wat anders is en laat de rest met rust, zodat een tweede keer draaien niets verandert. */
export function writeGenerated(root: string, files: readonly GeneratedFile[]): WriteResult {
  const written: string[] = [];
  const unchanged: string[] = [];
  for (const file of files) {
    const target = join(root, file.path);
    if (fileExists(target) && readText(target) === file.content) {
      unchanged.push(file.path);
      continue;
    }
    writeText(target, file.content);
    written.push(file.path);
  }
  return { written, unchanged };
}
