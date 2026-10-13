/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { checkNoEmDash } from "./no-em-dash.mjs";
import { checkServerActions } from "./server-actions.mjs";
import { checkLabelsSize } from "./labels-size.mjs";
import { checkNoConfigImport } from "./no-config-import.mjs";
import { templateOwnershipRule } from "./template-ownership.mjs";

function run(rule, rel, text) {
  const found = [];
  rule(rel, text, (message) => found.push(message));
  return found;
}

describe("no-em-dash", () => {
  it("vindt een em-dash en noemt de regel", () => {
    const dash = String.fromCodePoint(0x2014);
    expect(run(checkNoEmDash, "docs/x.md", `regel een\nregel ${dash} twee`)).toEqual([
      "docs/x.md:2 em-dash gevonden, gebruik een komma, dubbele punt, haakjes of een nieuwe zin",
    ]);
  });

  it("laat het gegenereerde Next-blok en een citaat van de regel met rust", () => {
    const dash = String.fromCodePoint(0x2014);
    const text = `<!-- BEGIN:nextjs-agent-rules -->\nbreaking ${dash} changes\n<!-- END:nextjs-agent-rules -->\nNooit em-dashes (${dash})`;
    expect(run(checkNoEmDash, "CLAUDE.md", text)).toEqual([]);
  });
});

describe("server-actions", () => {
  it("laat async functies en types door en weigert een constante", () => {
    const text = `"use server";\nexport async function save() {}\nexport type State = {};\nexport const X = 1;`;
    const found = run(checkServerActions, "app/actions.ts", text);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("export const X = 1");
  });

  it("negeert bestanden zonder use server", () => {
    expect(run(checkServerActions, "lib/x.ts", "export const X = 1;")).toEqual([]);
  });
});

describe("labels-size", () => {
  it("weigert een labelbestand boven de grens en laat tests met rust", () => {
    const big = Array.from({ length: 601 }, () => "x").join("\n");
    expect(run(checkLabelsSize, "lib/i18n/labels.ts", big)).toHaveLength(1);
    expect(run(checkLabelsSize, "lib/i18n/template/en.test.ts", big)).toEqual([]);
    expect(run(checkLabelsSize, "lib/i18n/domain/home.ts", "const a = 1;")).toEqual([]);
  });
});

describe("template-ownership", () => {
  const owned = "/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */\nexport const a = 1;";
  const generated = "/* template-generated (theme) uit project.config.json. Niet bewerken: pnpm template:generate schrijft hem opnieuw. */\n:root {}";
  const adopted = "/* template-adopted (module core). Van het project sinds template 0.1.0; pnpm template:update raakt dit bestand niet meer aan. */\nexport const a = 2;";
  const plain = "export const a = 3;";
  const lock = {
    files: {
      "lib/a.ts": { module: "core", class: "owned" },
      "app/theme.css": { module: "core", class: "generated" },
      "docs/SPEC.md": { module: "core", class: "seed" },
    },
    adopted: ["lib/b.ts"],
  };
  const rule = templateOwnershipRule(lock);

  it("eist de kop op een owned of generated bestand uit de lock", () => {
    expect(run(rule, "lib/a.ts", owned)).toEqual([]);
    expect(run(rule, "lib/a.ts", plain)).toHaveLength(1);
    expect(run(rule, "lib/a.ts", generated)[0]).toContain("staat in de lock als owned");
    expect(run(rule, "app/theme.css", generated)).toEqual([]);
    expect(run(rule, "app/theme.css", owned)[0]).toContain("staat in de lock als generated");
  });

  it("weigert een templatekop op een bestand dat niet in de lock staat, en laat seeds en overgenomen bestanden met rust", () => {
    expect(run(rule, "lib/c.ts", owned)[0]).toContain("staat niet in de lock");
    expect(run(rule, "lib/c.ts", plain)).toEqual([]);
    expect(run(rule, "docs/SPEC.md", "# Spec")).toEqual([]);
    expect(run(rule, "lib/b.ts", adopted)).toEqual([]);
    expect(run(rule, "lib/b.ts", owned)[0]).toContain("overgenomen door het project");
  });

  it("doet niets zonder lock, zonder commentaarvorm en onder template/modules/", () => {
    expect(run(templateOwnershipRule(null), "lib/c.ts", owned)).toEqual([]);
    expect(run(rule, "lib/c.json", owned)).toEqual([]);
    expect(run(rule, "template/modules/jobs/files/lib/jobs/queue.ts", "/* template-owned (module jobs). */")).toEqual([]);
  });
});

describe("no-config-import", () => {
  it("weigert een import van project.config.json in de app en niet in scripts", () => {
    const text = `import config from "../../project.config.json";`;
    expect(run(checkNoConfigImport, "lib/project/x.ts", text)).toHaveLength(1);
    expect(run(checkNoConfigImport, "scripts/x.ts", text)).toEqual([]);
  });
});
