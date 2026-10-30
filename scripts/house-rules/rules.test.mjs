/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkClientGraph } from "./client-graph.mjs";
import { checkNoEmDash } from "./no-em-dash.mjs";
import { checkSameId } from "./same-id.mjs";
import { checkSecretPatterns } from "./secret-patterns.mjs";
import { checkServerActions } from "./server-actions.mjs";
import { checkSessionFirst } from "./session-first.mjs";
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

describe("session-first", () => {
  const header = '"use server";\nimport { requireActor } from "@/lib/auth/session";\n\n';

  it("laat een action door die met de sessie begint, met of zonder const, en voorbij commentaar en een returntype met accolades", () => {
    const text = [
      header,
      "export async function a(form: FormData): Promise<{ ok: boolean }> {\n  /* eerst wie */\n  const actor = await requireActor();\n  return { ok: true };\n}\n",
      "export async function b(): Promise<void> {\n  // niets\n  await requireSession();\n}\n",
      "export async function c(input: { id: string }) {\n  const { organisationId } = await requireActor(\"admin\");\n  return organisationId;\n}\n",
    ].join("\n");
    expect(run(checkSessionFirst, "app/actions.ts", text)).toEqual([]);
  });

  it("weigert een action die eerst naar de invoer kijkt, en noemt de naam", () => {
    const text = `${header}export async function save(form: FormData): Promise<void> {\n  const text = String(form.get("text") ?? "");\n  const actor = await requireActor();\n  void actor;\n  void text;\n}\n`;
    const found = run(checkSessionFirst, "app/actions.ts", text);
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("app/actions.ts:4 save begint niet met de sessie");
  });

  it("laat een bewust anonieme action door, maar alleen met een reden", () => {
    const anonymous = `${header}/** session-first: inloggen heeft nog geen sessie. */\nexport async function signInAction(form: FormData) {\n  await signIn(form);\n}\n`;
    expect(run(checkSessionFirst, "app/sign-in/actions.ts", anonymous)).toEqual([]);
    const withoutReason = `${header}// session-first:\nexport async function signInAction(form: FormData) {\n  await signIn(form);\n}\n`;
    expect(run(checkSessionFirst, "app/sign-in/actions.ts", withoutReason)).toHaveLength(1);
  });

  it("negeert bestanden zonder use server", () => {
    expect(run(checkSessionFirst, "lib/x.ts", "export async function x() {\n  return 1;\n}\n")).toEqual([]);
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

describe("same-id", () => {
  it("weigert === en !== tegen actor.id, aan beide kanten", () => {
    expect(run(checkSameId, "lib/a.ts", "if (userId === actor.id) return;")).toHaveLength(1);
    expect(run(checkSameId, "app/a.ts", "if (actor.id !== input.userId) return;")).toHaveLength(1);
    expect(run(checkSameId, "lib/a.ts", "const mine = row.ownerId === actor.id;")[0]).toContain("sameId()");
  });

  it("laat sameId, een vergelijking met een letterlijke tekst en tests met rust", () => {
    expect(run(checkSameId, "lib/a.ts", "if (sameId(userId, actor.id)) return;")).toEqual([]);
    expect(run(checkSameId, "lib/a.ts", 'const id = actor.id === "" ? null : actor.id;')).toEqual([]);
    expect(run(checkSameId, "lib/a.test.ts", "expect(userId === actor.id).toBe(true);")).toEqual([]);
    expect(run(checkSameId, "scripts/a.ts", "if (userId === actor.id) return;")).toEqual([]);
  });
});

describe("secret-patterns", () => {
  /* De nepgeheimen worden pas hier aan elkaar gezet: als letterlijke tekst zou dit bestand zelf vallen. */
  const sas = "https://acc.blob.core.windows.net/c/x.pdf?sv=2022-11-02&sp=r&" + "sig" + "=" + "AbC1".repeat(10) + "%3D";
  const entra = "abc" + "8Q" + "~" + "x".repeat(34);
  const teams = "https://org.webhook.office" + ".com/webhookb2/" + "0123abcd-".repeat(5) + "@x/IncomingWebhook/ab";
  const pat = "AZURE_DEVOPS_PAT" + "=" + "a1".repeat(26);
  const accountKey = "AccountName=x;Account" + "Key=" + "Ab+/".repeat(22);
  const privateKey = "-----BEGIN " + "OPENSSH PRIVATE KEY-----";
  const cases = [
    ["een SAS", sas, "SAS"],
    ["een Entra-secret", entra, "Entra"],
    ["een Teams-webhook", teams, "webhook"],
    ["een PAT", pat, "PAT"],
    ["een accountsleutel", accountKey, "accountsleutel"],
    ["een private key", privateKey, "private key"],
  ];

  for (const [kind, secret, expected] of cases) {
    it(`vindt ${kind}, met bestand en regel, zonder de waarde te noemen`, () => {
      const found = run(checkSecretPatterns, "scripts/debug.ts", `const a = 1;\nconst value = "${secret}";\n`);
      expect(found).toHaveLength(1);
      expect(found[0]).toContain("scripts/debug.ts:2");
      expect(found[0]).toContain(expected);
      expect(found[0]).not.toContain(secret.slice(-12));
    });
  }

  it("laat een document over de patronen, .env-bestanden, lockfiles en een gemarkeerde regel staan", () => {
    const doc = ["Een SAS draagt `sig=`, een opslagstring `AccountKey=`.", "AZURE_DEVOPS_PAT_EXPIRES=2026-12-31", 'const pat = process.env["AZURE_DEVOPS_PAT"] ?? "";'].join("\n");
    expect(run(checkSecretPatterns, "docs/x.md", doc)).toEqual([]);
    expect(run(checkSecretPatterns, ".env.local", pat)).toEqual([]);
    expect(run(checkSecretPatterns, "pnpm-lock.yaml", sas)).toEqual([]);
    expect(run(checkSecretPatterns, "scripts/x.ts", `// secretlint-disable-next-line\nconst value = "${sas}";\n`)).toEqual([]);
  });
});

describe("client-graph", () => {
  function repo(files) {
    const root = mkdtempSync(join(tmpdir(), "client-graph-"));
    for (const [rel, text] of Object.entries(files)) {
      mkdirSync(dirname(join(root, rel)), { recursive: true });
      writeFileSync(join(root, rel), text);
    }
    return root;
  }

  async function graph(files) {
    const root = repo(files);
    try {
      const found = [];
      await checkClientGraph(root, (message) => found.push(message));
      return found;
    } finally {
      rmSync(root, { recursive: true, force: true });
    }
  }

  it("volgt een omweg van twee imports tot de database en noemt de route", async () => {
    const found = await graph({
      "components/form.tsx": `"use client";\nimport { rule } from "@/lib/rules";\n`,
      "lib/rules.ts": `import { CONTAINER } from "./storage";\nexport const rule = 1;\n`,
      "lib/storage.ts": `import { getDb } from "@/lib/db/client";\nexport const CONTAINER = process.env.STORAGE_CONTAINER;\n`,
    });
    expect(found).toHaveLength(1);
    expect(found[0]).toContain("components/form.tsx -> lib/rules.ts -> lib/storage.ts");
    expect(found[0]).toContain("@/lib/db/client");
    expect(found[0]).toContain("process.env.STORAGE_CONTAINER");
  });

  it("stopt bij een use server-grens en negeert import type en publieke variabelen", async () => {
    const found = await graph({
      "components/form.tsx": `"use client";\nimport { save } from "@/app/actions";\nimport type { Row } from "@/lib/db/rows";\nimport { name } from "@/lib/public";\n`,
      "app/actions.ts": `"use server";\nimport { getDb } from "@/lib/db/client";\nexport async function save() {}\n`,
      "lib/public.ts": `export const name = process.env.NEXT_PUBLIC_NAME ?? process.env.NODE_ENV;\n`,
    });
    expect(found).toEqual([]);
  });
});
