/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { normaliseConfig } from "./config";
import { loadManifest } from "./manifest";
import { longDate, placeholdersIn, renderPlaceholders, todayIn, type PlaceholderContext } from "./placeholders";

const manifest = loadManifest(process.cwd());
const config = normaliseConfig(
  {
    configVersion: 1,
    project: { name: "Rooster De Weide", slug: "rooster", description: "Een rooster voor vrijwilligers.", organisation: { name: "De Weide" } },
    brand: { colours: { primary: "#e07b00", accent: "#5b8c3a" } },
    auth: { provider: "entra" },
  },
  manifest,
).config;

if (config === undefined) throw new Error("de testconfiguratie is niet geldig");

const context: PlaceholderContext = { config, today: "2026-10-02", templateVersion: "0.1.0", templateSource: null };

describe("placeholders", () => {
  it("vult de bekende namen in, met of zonder spaties", () => {
    expect(renderPlaceholders("# {{project.name}} ({{ project.slug }})\n{{today.long}}, template {{template.version}}", context)).toBe(
      "# Rooster De Weide (rooster)\n2 oktober 2026, template 0.1.0",
    );
    expect(renderPlaceholders("{{template.source}}", context)).toBe("(nog niet ingesteld)");
  });

  it("gooit bij een onbekende naam en noemt het bestand", () => {
    expect(() => renderPlaceholders("{{project.owner}}", context, "docs/SPEC.md")).toThrow(/Onbekende placeholder \{\{project\.owner\}\} in docs\/SPEC\.md/);
  });

  it("laat tekst met rust die geen placeholder is", () => {
    expect(renderPlaceholders("const x = `${y}`; {{ niet geldig }}", context)).toBe("const x = `${y}`; {{ niet geldig }}");
  });

  it("schrijft de rechtenmatrix uit de rollen: beheerders alles, de rest niets", () => {
    expect(renderPlaceholders("{\n{{auth.matrix}}\n};", context)).toBe("{\n  admin: [...ACTIONS],\n  member: [],\n};");
    const extra = normaliseConfig(
      {
        configVersion: 1,
        project: { name: "Rooster De Weide", slug: "rooster", description: "Een rooster voor vrijwilligers.", organisation: { name: "De Weide" } },
        brand: { colours: { primary: "#e07b00", accent: "#5b8c3a" } },
        auth: {
          provider: "entra",
          roles: [
            { value: "admin", label: { nl: "Beheerder", en: "Administrator" }, admin: true },
            { value: "coordinator", label: { nl: "Coördinator", en: "Coordinator" }, admin: false },
            { value: "volunteer", label: { nl: "Vrijwilliger", en: "Volunteer" }, admin: false },
          ],
        },
      },
      manifest,
    ).config;
    if (extra === undefined) throw new Error("de testconfiguratie is niet geldig");
    expect(renderPlaceholders("{{auth.matrix}}", { ...context, config: extra })).toBe("  admin: [...ACTIONS],\n  coordinator: [],\n  volunteer: [],");
  });

  it("somt op welke placeholders een tekst gebruikt", () => {
    expect(placeholdersIn("{{project.name}} en {{today}}")).toEqual(["project.name", "today"]);
  });

  it("schrijft datums in de taal van het project", () => {
    expect(longDate("2026-10-02", "nl-NL")).toBe("2 oktober 2026");
    expect(longDate("2026-10-02", "en-GB")).toBe("2 October 2026");
    expect(() => longDate("gisteren", "nl-NL")).toThrow(/Geen datum/);
  });

  it("bepaalt vandaag in een tijdzone", () => {
    expect(todayIn("Europe/Amsterdam", new Date("2026-10-02T23:30:00Z"))).toBe("2026-10-03");
    expect(todayIn("UTC", new Date("2026-10-02T23:30:00Z"))).toBe("2026-10-02");
  });
});
