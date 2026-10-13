/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { CLAUDE_MD_PREAMBLE, patchClaudeMd } from "./claude-md";
import { ENV_EXAMPLE_PREAMBLE, patchEnvExample } from "./env-example";
import { patchGitignore } from "./gitignore";
import { HASH_BLOCKS, HTML_BLOCKS, patchManagedBlocks } from "./managed-blocks";

const core = { name: "core", body: "regel een\nregel twee\n\n\n" };
const jobs = { name: "jobs", body: "\n\nwachtrij\n" };

describe("beheerde blokken", () => {
  it("zet blokken in een leeg bestand, na de aanhef", () => {
    const result = patchManagedBlocks("", [core, jobs], [], HASH_BLOCKS, { preamble: "# aanhef" });
    expect(result.text).toBe(
      [
        "# aanhef",
        "",
        "# >>> template:core (beheerd blok, wordt bijgewerkt door pnpm template:update)",
        "regel een",
        "regel twee",
        "# <<< template:core",
        "",
        "# >>> template:jobs (beheerd blok, wordt bijgewerkt door pnpm template:update)",
        "wachtrij",
        "# <<< template:jobs",
        "",
      ].join("\n"),
    );
    expect(result.changes).toEqual(["blok core toegevoegd", "blok jobs toegevoegd"]);
    expect(result.managed).toEqual(["core", "jobs"]);
  });

  it("is idempotent, ook met rommelige witregels eromheen", () => {
    const first = patchManagedBlocks("eigen tekst\n\n\n\n# >>> template:core\noud\n# <<< template:core\n\n\n\nmeer eigen tekst\n\n\n", [core], ["core"], HASH_BLOCKS);
    expect(first.text).toBe(
      ["eigen tekst", "", "# >>> template:core (beheerd blok, wordt bijgewerkt door pnpm template:update)", "regel een", "regel twee", "# <<< template:core", "", "meer eigen tekst", ""].join("\n"),
    );
    expect(first.changes).toEqual(["blok core bijgewerkt"]);
    const second = patchManagedBlocks(first.text, [core], first.managed, HASH_BLOCKS);
    expect(second.text).toBe(first.text);
    expect(second.changes).toEqual([]);
  });

  it("verwijdert een blok dat niet meer van het template is en laat een onbekend blok staan", () => {
    const text = ["# >>> template:core", "x", "# <<< template:core", "", "# >>> template:oud", "y", "# <<< template:oud", "", "# >>> template:vreemd", "z", "# <<< template:vreemd", ""].join("\n");
    const result = patchManagedBlocks(text, [core], ["core", "oud"], HASH_BLOCKS);
    expect(result.text).not.toContain("template:oud");
    expect(result.text).toContain("# >>> template:vreemd\nz\n# <<< template:vreemd");
    expect(result.changes).toEqual(["blok core bijgewerkt", "blok oud verwijderd (niet meer in het template)"]);
    expect(result.warnings).toEqual(["blok vreemd hoort bij geen toegepaste module en is met rust gelaten"]);
  });

  it("zet nieuwe blokken vóór het anker als dat er is", () => {
    const text = "# Titel\n\n<!-- template:begin core -->\nx\n<!-- template:end core -->\n\n## Eigen\n\n<!-- BEGIN:nextjs-agent-rules -->\nnext\n<!-- END:nextjs-agent-rules -->\n";
    const result = patchClaudeMd(text, [{ name: "core", body: "x" }, jobs], ["core"]);
    expect(result.text).toBe(
      [
        "# Titel",
        "",
        "<!-- template:begin core -->",
        "x",
        "<!-- template:end core -->",
        "",
        "## Eigen",
        "",
        "<!-- template:begin jobs -->",
        "wachtrij",
        "<!-- template:end jobs -->",
        "",
        "<!-- BEGIN:nextjs-agent-rules -->",
        "next",
        "<!-- END:nextjs-agent-rules -->",
        "",
      ].join("\n"),
    );
    expect(result.changes).toEqual(["blok jobs toegevoegd"]);
  });

  it("maakt CLAUDE.md aan met de aanhef als het bestand er niet is", () => {
    const result = patchClaudeMd("", [core], []);
    expect(result.text.startsWith(`${CLAUDE_MD_PREAMBLE}\n\n<!-- template:begin core -->`)).toBe(true);
  });

  it("gooit bij een blok zonder eindmarker", () => {
    expect(() => patchManagedBlocks("<!-- template:begin core -->\nx\n", [core], [], HTML_BLOCKS)).toThrow(/blok core heeft geen eindmarker/);
    expect(() => patchManagedBlocks("<!-- template:begin core -->\nx\n<!-- template:end jobs -->\n", [core], [], HTML_BLOCKS)).toThrow(/gesloten door de eindmarker van jobs/);
  });
});

describe(".env.example", () => {
  it("begint met de aanhef en waarschuwt voor een variabele die ook los staat", () => {
    const block = { name: "core", body: "DATABASE_URL=\nAUTH_SECRET=" };
    const fresh = patchEnvExample("", [block], []);
    expect(fresh.text.startsWith(ENV_EXAMPLE_PREAMBLE)).toBe(true);
    expect(fresh.warnings).toEqual([]);

    const doubled = patchEnvExample(`${fresh.text}\nAUTH_SECRET=mijn\n`, [block], ["core"]);
    expect(doubled.warnings).toEqual(["AUTH_SECRET staat ook buiten het beheerde blok template:core; haal de losse regel weg, de regel in het blok is de bedoelde"]);
  });
});

describe(".gitignore", () => {
  it("laat eigen regels staan en is idempotent", () => {
    const first = patchGitignore("eigen/\n", [{ name: "core", body: "node_modules/\n.next/" }], []);
    expect(first.text).toBe("eigen/\n\n# >>> template:core (beheerd blok, wordt bijgewerkt door pnpm template:update)\nnode_modules/\n.next/\n# <<< template:core\n");
    expect(patchGitignore(first.text, [{ name: "core", body: "node_modules/\n.next/" }], first.managed).text).toBe(first.text);
  });
});
