/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `template:add <module>`: de module (en wat ze vereist) in project.config.json zetten. Toepassen
 * doet apply daarna; dit raakt alleen de configuratie.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { CONFIG_FILE } from "./config";
import { isPlainObject } from "./dsl";
import type { Manifest } from "./manifest";

export class AddError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AddError";
  }
}

export interface AddResult {
  readonly added: readonly string[];
  readonly alreadyPresent: readonly string[];
  readonly planned: readonly string[];
}

/** De module plus alles wat ze (door)vereist, in volgorde van toepassen. */
export function closureOf(manifest: Manifest, names: readonly string[]): string[] {
  const order: string[] = [];
  const visit = (name: string): void => {
    if (order.includes(name) || name === "core") return;
    const found = manifest.modules[name];
    if (found === undefined) {
      const available = Object.entries(manifest.modules)
        .filter(([, module]) => !module.always && module.status !== "reserved")
        .map(([key]) => key);
      throw new AddError(`Onbekende module "${name}". Beschikbaar: ${available.join(", ")}.`);
    }
    if (found.status === "reserved") throw new AddError(`Module "${name}" is gereserveerd voor een latere versie van het template.`);
    for (const required of found.requires) visit(required);
    order.push(name);
  };
  for (const name of names) visit(name);
  return order;
}

export function addModules(root: string, manifest: Manifest, names: readonly string[]): AddResult {
  const path = join(root, CONFIG_FILE);
  const raw: unknown = JSON.parse(readFileSync(path, "utf8"));
  if (!isPlainObject(raw)) throw new AddError(`${CONFIG_FILE} is geen object.`);

  const current = Array.isArray(raw.modules) ? raw.modules.filter((item): item is string => typeof item === "string") : [];
  const wanted = closureOf(manifest, names);
  for (const name of wanted) {
    for (const other of manifest.modules[name]?.conflicts ?? []) {
      if (current.includes(other) || wanted.includes(other)) throw new AddError(`"${name}" gaat niet samen met "${other}", die al in de configuratie staat.`);
    }
  }

  const added = wanted.filter((name) => !current.includes(name));
  const alreadyPresent = wanted.filter((name) => current.includes(name));
  if (added.length > 0) {
    raw.modules = [...current, ...added];
    writeFileSync(path, `${JSON.stringify(raw, null, 2)}\n`, "utf8");
  }
  return { added, alreadyPresent, planned: wanted.filter((name) => manifest.modules[name]?.status === "planned") };
}
