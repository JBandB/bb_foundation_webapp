/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Welke bestanden de huisregels bekijken.
 *
 * Bewust een eigen wandeling en niet git ls-files: de regels moeten ook gelden
 * voor iets wat nog niet gecommit is, want dan hoor je het op het moment dat je
 * het schrijft en niet pas in CI.
 */

import { readdir, stat } from "node:fs/promises";
import { join, relative, sep } from "node:path";

/** Mappen die nooit worden bekeken, op naam of op pad vanaf de repowortel. */
const SKIP = new Set([
  ".git",
  ".next",
  ".vercel",
  "node_modules",
  "coverage",
  "playwright-report",
  "test-results",
  // Kopieën van overschreven bestanden, zie pnpm template:apply --force.
  ".template-backup",
  // Een logo is van het merk en wordt nooit aangepast.
  "public/brand",
]);

/** Bestandstypes waar tekstregels op van toepassing zijn. */
const TEXT_EXTENSIONS = new Set([
  ".ts",
  ".tsx",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".css",
  ".md",
  ".sql",
  ".json",
  ".yml",
  ".yaml",
  ".html",
]);

export function toPosix(path) {
  return path.split(sep).join("/");
}

/** Alle relevante bestandspaden, relatief aan de wortel, met posix-slashes. */
export async function collectFiles(root, dir = root) {
  const found = [];
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    const rel = toPosix(relative(root, full));
    if (SKIP.has(name) || SKIP.has(rel)) continue;

    const info = await stat(full);
    if (info.isDirectory()) {
      found.push(...(await collectFiles(root, full)));
    } else if (TEXT_EXTENSIONS.has(name.slice(name.lastIndexOf(".")))) {
      found.push(rel);
    }
  }
  return found;
}

/** Het regelnummer waarop een tekenpositie valt, één-gebaseerd. */
export function lineAt(text, index) {
  return text.slice(0, index).split("\n").length;
}

/** De eerste regel die code is: geen lege regel en geen commentaar. */
export function firstCodeLine(text) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .find(
      (line) =>
        line !== "" && !line.startsWith("//") && !line.startsWith("/*") && !line.startsWith("*"),
    );
}
