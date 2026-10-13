/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Bestanden lezen en schrijven zoals de template-tooling dat overal doet: paden met gewone slashes,
 * tekst met LF, en een vaste lijst van wat binair is. Eén plek, zodat hashes en vergelijkingen op
 * elke machine hetzelfde uitkomen.
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { dirname, extname, join, relative, sep } from "node:path";
import { normaliseNewlines } from "./lock";

const BINARY_EXTENSIONS = new Set([".woff2", ".woff", ".ttf", ".otf", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".webp", ".pdf", ".zip"]);

export function isBinaryPath(path: string): boolean {
  return BINARY_EXTENSIONS.has(extname(path).toLowerCase());
}

export function toPosix(path: string): string {
  return path.split(sep).join("/");
}

export function fileExists(path: string): boolean {
  return existsSync(path) && statSync(path).isFile();
}

export function directoryExists(path: string): boolean {
  return existsSync(path) && statSync(path).isDirectory();
}

/** Tekst met LF, zonder BOM. */
export function readText(path: string): string {
  return normaliseNewlines(readFileSync(path, "utf8"));
}

export function readBytes(path: string): Uint8Array {
  return new Uint8Array(readFileSync(path));
}

/** Schrijft tekst met LF en maakt de map aan als die er niet is. */
export function writeText(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, normaliseNewlines(text), "utf8");
}

export function writeBytes(path: string, bytes: Uint8Array): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, bytes);
}

/** Mappen die nooit meetellen bij een wandeling door een project. */
export const SKIPPED_DIRECTORIES = new Set([".git", ".next", ".vercel", "node_modules", ".template-backup", "coverage", "playwright-report", "test-results"]);

/** Alle bestanden onder een map, als posix-paden relatief aan `root`, gesorteerd. */
export function walkFiles(root: string, dir = root, skip = SKIPPED_DIRECTORIES): string[] {
  const found: string[] = [];
  for (const name of readdirSync(dir)) {
    if (skip.has(name)) continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) found.push(...walkFiles(root, full, skip));
    else found.push(toPosix(relative(root, full)));
  }
  return found.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
}
