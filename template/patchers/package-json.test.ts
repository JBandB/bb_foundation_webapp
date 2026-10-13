/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { patchPackageJson, type PackageJsonDesired, type PackageJsonManaged } from "./package-json";

const desired: PackageJsonDesired = {
  packageManager: "pnpm@11.20.0",
  engines: { node: "24.x" },
  scripts: { build: "next build", typecheck: "tsc --noEmit" },
  dependencies: { next: "16.3.6", react: "19.2.8" },
  devDependencies: { typescript: "6.0.3" },
};
const none: PackageJsonManaged = { scripts: {}, dependencies: {}, devDependencies: {} };
const options = { skipDependencies: [], name: "webapp" };

describe("package.json", () => {
  it("maakt een nieuw bestand met de vaste volgorde", () => {
    const result = patchPackageJson("", desired, none, options);
    expect(JSON.parse(result.text)).toEqual({
      name: "webapp",
      version: "0.0.0",
      private: true,
      packageManager: "pnpm@11.20.0",
      engines: { node: "24.x" },
      scripts: { build: "next build", typecheck: "tsc --noEmit" },
      dependencies: { next: "16.3.6", react: "19.2.8" },
      devDependencies: { typescript: "6.0.3" },
    });
    expect(Object.keys(JSON.parse(result.text))).toEqual(["name", "version", "private", "packageManager", "engines", "scripts", "dependencies", "devDependencies"]);
    expect(result.installNeeded).toBe(true);
    expect(result.managed).toEqual({ scripts: desired.scripts, dependencies: desired.dependencies, devDependencies: desired.devDependencies });
  });

  it("is een vast punt na één keer toepassen", () => {
    const first = patchPackageJson("", desired, none, options);
    const second = patchPackageJson(first.text, desired, first.managed, options);
    expect(second.text).toBe(first.text);
    expect(second.changes).toEqual([]);
    expect(second.installNeeded).toBe(false);
  });

  it("laat scripts en pakketten van het project met rust, en sorteert de pakketten", () => {
    const project = JSON.stringify({
      name: "eigen",
      private: true,
      scripts: { "db:seed": "node seed.js" },
      dependencies: { zod: "4.0.0" },
      devDependencies: {},
      pnpm: { overrides: {} },
    });
    const result = patchPackageJson(project, desired, none, options);
    const parsed = JSON.parse(result.text) as { scripts: Record<string, string>; dependencies: Record<string, string>; pnpm: unknown };
    expect(parsed.scripts).toEqual({ "db:seed": "node seed.js", build: "next build", typecheck: "tsc --noEmit" });
    expect(Object.keys(parsed.dependencies)).toEqual(["next", "react", "zod"]);
    expect(parsed.pnpm).toEqual({ overrides: {} });
  });

  it("zet een gewijzigd templatescript terug met een waarschuwing, en verwijdert een oud script alleen als het ongewijzigd is", () => {
    const previous: PackageJsonManaged = { scripts: { build: "next build", oud: "node oud.js", aangepast: "node a.js" }, dependencies: {}, devDependencies: {} };
    const project = JSON.stringify({ name: "x", private: true, scripts: { build: "next build --debug", oud: "node oud.js", aangepast: "node b.js" } });
    const result = patchPackageJson(project, desired, previous, options);
    const scripts = (JSON.parse(result.text) as { scripts: Record<string, string> }).scripts;
    expect(scripts).toEqual({ build: "next build", aangepast: "node b.js", typecheck: "tsc --noEmit" });
    expect(result.warnings).toEqual([
      "script build was door het project gewijzigd en is teruggezet naar de templatewaarde; geef een eigen variant een eigen naam",
      "script aangepast is niet meer van het template en was door het project gewijzigd; hij blijft staan",
    ]);
    expect(result.changes).toContain("script oud verwijderd (niet meer in het template)");
  });

  it("laat een pin met rust als het pakket in skipDependencies staat, en meldt wat het template verwacht", () => {
    const project = JSON.stringify({ name: "x", private: true, dependencies: { next: "16.4.0" } });
    const result = patchPackageJson(project, desired, none, { ...options, skipDependencies: ["next"] });
    const parsed = JSON.parse(result.text) as { dependencies: Record<string, string> };
    expect(parsed.dependencies.next).toBe("16.4.0");
    expect(result.warnings).toEqual(["next: het template verwacht 16.3.6, het project houdt 16.4.0 (template.skipDependencies)"]);
    expect(result.managed.dependencies).toEqual({ react: "19.2.8" });
  });

  it("verhuist een pakket naar de juiste sectie en zet een pin terug met uitleg", () => {
    const previous: PackageJsonManaged = { scripts: {}, dependencies: { next: "16.3.6" }, devDependencies: {} };
    const project = JSON.stringify({ name: "x", private: true, dependencies: { next: "16.3.0" }, devDependencies: { react: "19.2.8" } });
    const result = patchPackageJson(project, desired, previous, options);
    const parsed = JSON.parse(result.text) as { dependencies: Record<string, string>; devDependencies: Record<string, string> };
    expect(parsed.dependencies).toEqual({ next: "16.3.6", react: "19.2.8" });
    expect(parsed.devDependencies).toEqual({ typescript: "6.0.3" });
    expect(result.changes).toContain("react verhuisd naar dependencies");
    expect(result.warnings).toEqual(["next was door het project op 16.3.0 gezet en is teruggezet naar 16.3.6; zet het pakket in template.skipDependencies als dat bewust was"]);
    expect(result.installNeeded).toBe(true);
  });

  it("gooit bij ongeldige JSON met de bestandsnaam", () => {
    expect(() => patchPackageJson("{", desired, none, options)).toThrow(/package\.json is geen geldige JSON/);
  });
});
