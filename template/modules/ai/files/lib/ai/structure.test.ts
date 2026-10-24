/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import type { AiOutputField } from "./prompts";
import { outputSchema, validateProposal } from "./structure";

const FIELDS: readonly AiOutputField[] = [
  { key: "category", label: "Categorie", kind: "choice", options: ["Kinderfeestje", "Schoolbezoek", "Overig"] },
  { key: "summary", label: "Samenvatting", kind: "short", maxLength: 40 },
  { key: "questions", label: "Open vragen", kind: "list", maxItems: 2 },
  { key: "menu", label: "Menu", kind: "list", maxItems: 3, items: [{ key: "course", label: "Gang" }, { key: "dish", label: "Gerecht" }] },
  { key: "children", label: "Aantal kinderen", kind: "number", min: 1, max: 30 },
  { key: "outside", label: "Buiten", kind: "yesno" },
];

const GOOD = {
  category: "Kinderfeestje",
  summary: "Feestje voor 8 kinderen.",
  questions: ["Binnen of buiten?"],
  menu: [{ course: "Hoofdgerecht", dish: "Pannenkoek" }],
  children: 8,
  outside: true,
};

describe("het schema van de vaste structuur", () => {
  const schema = outputSchema(FIELDS) as { required: string[]; additionalProperties: boolean; properties: Record<string, Record<string, unknown>> };

  it("maakt elk onderdeel verplicht en laat niets anders toe", () => {
    expect(schema.required).toEqual(FIELDS.map((field) => field.key));
    expect(schema.additionalProperties).toBe(false);
  });

  it("zet een keuze om in een enum en een lijst van onderdelen in objecten zonder extra velden", () => {
    expect(schema.properties.category?.enum).toEqual(["Kinderfeestje", "Schoolbezoek", "Overig"]);
    expect(schema.properties.menu?.items).toMatchObject({ type: "object", required: ["course", "dish"], additionalProperties: false });
  });

  it("draagt geen grenzen die structured outputs niet kent, wel in de beschrijving", () => {
    const text = JSON.stringify(schema);
    expect(text).not.toMatch(/maxLength|maxItems|minimum|maximum/);
    expect(schema.properties.summary?.description).toContain("hoogstens 40 tekens");
  });
});

describe("de controle van een voorstel", () => {
  it("laat een goed voorstel door", () => {
    expect(validateProposal(FIELDS, GOOD)).toEqual({ ok: true, proposal: GOOD });
  });

  it.each([
    ["een keuze die er niet is", { ...GOOD, category: "Bruiloft" }, "category"],
    ["te lange tekst", { ...GOOD, summary: "x".repeat(41) }, "summary"],
    ["te veel punten", { ...GOOD, questions: ["a", "b", "c"] }, "questions"],
    ["een item zonder vaste onderdelen", { ...GOOD, menu: [{ course: "Toetje" }] }, "menu"],
    ["een getal buiten de grenzen", { ...GOOD, children: 0 }, "children"],
    ["tekst in plaats van ja of nee", { ...GOOD, outside: "ja" }, "outside"],
    ["een extra onderdeel", { ...GOOD, price: 12 }, "price"],
  ])("weigert %s", (_name, value, key) => {
    const result = validateProposal(FIELDS, value);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.problem).toContain(key);
  });

  it("weigert een ontbrekend onderdeel en iets dat geen object is", () => {
    const { outside: _outside, ...missing } = GOOD;
    expect(validateProposal(FIELDS, missing).ok).toBe(false);
    expect(validateProposal(FIELDS, [GOOD]).ok).toBe(false);
    expect(validateProposal(FIELDS, null).ok).toBe(false);
  });
});
