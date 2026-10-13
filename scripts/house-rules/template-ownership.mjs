/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: de kop van een bestand klopt met de lock van het template.
 *
 * Elk bestand dat de lock als owned of generated kent en een commentaarvorm heeft, draagt de kop
 * `template-owned` of `template-generated`. En andersom: een bestand met zo'n kop staat in de lock,
 * want een kop die zegt "wordt overschreven" terwijl niets het ooit overschrijft, is een verkeerde
 * belofte. Een overgenomen bestand (`template:adopt`) draagt `template-adopted` en staat onder
 * `adopted`.
 *
 * Zonder lock (een verse kloon vóór de eerste apply) doet deze regel niets: dan is er niets om tegen
 * te controleren. De bronnen van opt-in modules onder template/modules/ vallen erbuiten, want die
 * worden pas bij apply in de boom gezet.
 */

import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const LOCK = "template.lock.json";
const HEADER = /template-(owned|generated|adopted) \(([^)]*)\)/;

/** Dezelfde commentaarvormen als template/lib/header.ts kent. */
function hasCommentStyle(path) {
  const name = path.split("/").pop() ?? "";
  if (/^tsconfig.*\.json$/.test(name)) return true;
  if (path.includes(".githooks/") || name.startsWith(".env")) return true;
  if (name.startsWith(".") && !name.slice(1).includes(".")) return true;
  return /\.(ts|tsx|mts|cts|js|mjs|cjs|css|sql|md|mdx|html|yml|yaml|toml|sh)$/.test(name);
}

function headerOf(text) {
  const lines = text.split("\n");
  const first = (lines[0] ?? "").trim();
  const line = lines[first.startsWith("#!") || /^<!doctype\s/i.test(first) ? 1 : 0] ?? "";
  const match = HEADER.exec(line);
  return match === null ? undefined : { kind: match[1], detail: match[2] };
}

/** De regel voor één gegeven lock (null: geen lock), zodat de test hem met een eigen lock kan draaien. */
export function templateOwnershipRule(lock) {
  return (rel, text, report) => {
    if (lock === null || lock === undefined) return;
    if (rel.startsWith("template/modules/")) return;
    if (!hasCommentStyle(rel)) return;

    const entry = lock.files?.[rel];
    const adopted = Array.isArray(lock.adopted) && lock.adopted.includes(rel);
    const header = headerOf(text);

    if (entry !== undefined && (entry.class === "owned" || entry.class === "generated")) {
      if (header === undefined) {
        report(`${rel} staat in de lock als ${entry.class} maar mist de kop template-${entry.class}; zet hem terug met pnpm template:apply --force of neem het bestand over met pnpm template:adopt ${rel}`);
      } else if (header.kind !== entry.class) {
        report(`${rel} draagt de kop template-${header.kind} maar staat in de lock als ${entry.class}`);
      }
      return;
    }

    if (adopted) {
      if (header !== undefined && header.kind !== "adopted") report(`${rel} is overgenomen door het project maar draagt nog de kop template-${header.kind}; draai pnpm template:adopt ${rel} opnieuw`);
      return;
    }

    if (header !== undefined && header.kind !== "adopted") {
      report(`${rel} draagt de kop template-${header.kind} maar staat niet in de lock; het template schrijft dit bestand dus nooit. Haal de kop weg, of zet het bestand in template/manifest.json`);
    }
  };
}

let cached;
function readLockOnce(root) {
  if (cached !== undefined) return cached;
  const path = join(root, LOCK);
  cached = existsSync(path) ? JSON.parse(readFileSync(path, "utf8")) : null;
  return cached;
}

export function checkTemplateOwnership(rel, text, report) {
  templateOwnershipRule(readLockOnce(process.cwd()))(rel, text, report);
}
