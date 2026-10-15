/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De controlescripts in wizard/ draaien op een laptop waar de repo nog niet staat, dus ze kunnen
 * package.json niet lezen en noemen de versies van Node.js en pnpm zelf. Deze test bewijst dat die
 * gelijk lopen met package.json, en dat het PowerShell-script alleen ASCII bevat: Windows
 * PowerShell 5.1 leest een bestand zonder BOM als Windows-1252.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const read = (rel: string): string => readFileSync(join(root, rel), "utf8");

const pkg: unknown = JSON.parse(read("package.json"));

function field(path: readonly string[]): string {
  let value: unknown = pkg;
  for (const key of path) {
    if (typeof value !== "object" || value === null) return "";
    value = (value as Record<string, unknown>)[key];
  }
  return typeof value === "string" ? value : "";
}

const nodeMajor = /^(\d+)/.exec(field(["engines", "node"]))?.[1];
const pnpmVersion = /^pnpm@(\d+\.\d+\.\d+)/.exec(field(["packageManager"]))?.[1];

const ps1 = read("wizard/controle-laptop.ps1");
const sh = read("wizard/controle-laptop.sh");

describe("controlescripts voor de laptop", () => {
  it("package.json noemt een Node- en een pnpm-versie", () => {
    expect(nodeMajor).toBeDefined();
    expect(pnpmVersion).toBeDefined();
  });

  it("noemen dezelfde Node-versie als package.json", () => {
    expect(ps1).toContain(`$NodeMajor = ${nodeMajor}\n`);
    expect(sh).toContain(`NODE_MAJOR=${nodeMajor}\n`);
  });

  it("noemen dezelfde pnpm-versie als package.json", () => {
    expect(ps1).toContain(`$PnpmVersion = '${pnpmVersion}'\n`);
    expect(sh).toContain(`PNPM_VERSION=${pnpmVersion}\n`);
  });

  it("het PowerShell-script bevat alleen ASCII", () => {
    const offending = [...ps1].filter((char) => char.charCodeAt(0) > 127);
    expect(offending).toEqual([]);
  });

  it("geen em-dash in beide scripts", () => {
    const emDash = String.fromCodePoint(0x2014);
    expect(ps1.includes(emDash)).toBe(false);
    expect(sh.includes(emDash)).toBe(false);
  });
});
