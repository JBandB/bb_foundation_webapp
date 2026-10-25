/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { OFFLINE_STEPS, planBattery, summarise, toNodeCommands, words } from "./battery";

const SCRIPTS = {
  typecheck: "tsc --noEmit",
  lint: "eslint . && node scripts/lint-house-rules.mjs",
  test: "vitest run",
  "check:secrets": 'node node_modules/secretlint/bin/secretlint.js "**/*"',
  "check:migrations": "node scripts/check-migrations.mjs",
  "check:drift": "node scripts/check-drift.mjs",
  "check:contrast": "node scripts/check-contrast.mjs",
  "template:verify": "node template/cli/bootstrap.mjs verify",
  build: "next build",
  "db:roundtrip": "node --env-file-if-exists=.env.local node_modules/tsx/dist/cli.mjs scripts/db-roundtrip.ts",
  "check:files": "node --env-file-if-exists=.env.local node_modules/tsx/dist/cli.mjs scripts/check-files.ts",
  "check:core": "node --env-file-if-exists=.env.local node_modules/tsx/dist/cli.mjs scripts/check-core.ts",
  "check:all": "node --env-file-if-exists=.env.local node_modules/tsx/dist/cli.mjs scripts/check-all.ts",
  e2e: "node --env-file-if-exists=.env.local node_modules/@playwright/test/cli.js test",
  dev: "next dev",
};

describe("de batterij", () => {
  it("leest een opdrachtregel als woorden, ook tussen aanhalingstekens", () => {
    expect(words('node a.js "**/*" --x')).toEqual(["node", "a.js", "**/*", "--x"]);
    expect(words('  node  ""  ')).toEqual(["node", ""]);
  });

  it("zet elke regel om naar node, ook de binaries en een &&-keten, en weigert wat niet kan", () => {
    expect(toNodeCommands("tsc --noEmit")).toEqual({ ok: true, commands: [["node_modules/typescript/bin/tsc", "--noEmit"]] });
    expect(toNodeCommands("eslint . && node scripts/lint-house-rules.mjs")).toEqual({ ok: true, commands: [["node_modules/eslint/bin/eslint.js", "."], ["scripts/lint-house-rules.mjs"]] });
    expect(toNodeCommands("pnpm audit")).toMatchObject({ ok: false });
  });

  it("zet de stappen zonder database eerst, core vóór de andere checks, en de e2e als laatste", () => {
    const { steps, problems } = planBattery(SCRIPTS);
    expect(problems).toEqual([]);
    expect(steps.map((step) => step.name)).toEqual([...OFFLINE_STEPS, "db:roundtrip", "check:core", "check:files", "e2e"]);
    expect(steps.filter((step) => step.needsDatabase).map((step) => step.name)).toEqual(["db:roundtrip", "check:core", "check:files", "e2e"]);
  });

  it("noemt een ontbrekend script als probleem, niet als stille overslag", () => {
    const { typecheck: _weg, ...rest } = SCRIPTS;
    expect(planBattery(rest).problems).toEqual(["typecheck ontbreekt in package.json"]);
  });

  it("geeft 1 bij rood, 2 bij overgeslagen, en 0 alleen als alles draaide en groen is", () => {
    expect(summarise([{ name: "test", outcome: "ok", seconds: 1 }]).exitCode).toBe(0);
    expect(summarise([{ name: "test", outcome: "ok", seconds: 1 }, { name: "e2e", outcome: "skipped", seconds: 0, note: "geen database" }]).exitCode).toBe(2);
    expect(summarise([{ name: "test", outcome: "failed", seconds: 1 }, { name: "e2e", outcome: "skipped", seconds: 0 }]).exitCode).toBe(1);
    expect(summarise([{ name: "e2e", outcome: "skipped", seconds: 0, note: "geen database" }]).lines).toContain("| `pnpm e2e` | overgeslagen (geen database) | 0.0 s |");
  });
});
