/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { catalogueProblems, type AiPrompt } from "./prompts";
import { interpret } from "./run";

const PROMPT: AiPrompt = {
  key: "sort_request",
  version: 1,
  title: "Stel voor bij een aanvraag",
  instruction: "Je bent de planner. Sorteer de aanvraag en vat hem samen.",
  fields: ["Aantal kinderen", "Wensen"],
  output: [
    { key: "category", label: "Categorie", kind: "choice", options: ["Kinderfeestje", "Overig"] },
    { key: "summary", label: "Samenvatting", kind: "short", maxLength: 200 },
  ],
  defaultEffort: "low",
};

const text = (value: string) => ({ stop_reason: "end_turn", content: [{ type: "text", text: value }] });

describe("hoe een antwoord van de API wordt gelezen", () => {
  it("geeft een voorstel als het antwoord precies in de structuur past", () => {
    expect(interpret(PROMPT, text('{"category":"Overig","summary":"Past niet."}'))).toEqual({ status: "ok", proposal: { category: "Overig", summary: "Past niet." }, error: null });
  });

  it("geeft geen voorstel bij een weigering, een afgekapt antwoord, kapotte JSON of een andere vorm", () => {
    expect(interpret(PROMPT, { stop_reason: "refusal", content: [] }).status).toBe("refused");
    expect(interpret(PROMPT, { ...text('{"category":"Ov'), stop_reason: "max_tokens" }).status).toBe("invalid");
    expect(interpret(PROMPT, text("Hier is mijn antwoord: {}")).status).toBe("invalid");
    expect(interpret(PROMPT, text('{"category":"Bruiloft","summary":"x"}'))).toMatchObject({ status: "invalid", proposal: null });
  });
});

describe("de controle van de catalogus", () => {
  it("vindt niets mis aan een goede prompt", () => {
    expect(catalogueProblems([PROMPT])).toEqual([]);
  });

  it("meldt een dubbele sleutel, een keuze met één optie en een prompt zonder velden", () => {
    const bad: AiPrompt = { ...PROMPT, fields: [], output: [{ key: "category", label: "Categorie", kind: "choice", options: ["Overig"] }] };
    const problems = catalogueProblems([PROMPT, bad]);
    expect(problems.join("\n")).toMatch(/twee keer/);
    expect(problems.join("\n")).toMatch(/geen enkel veld/);
    expect(problems.join("\n")).toMatch(/minder dan twee opties/);
  });
});
