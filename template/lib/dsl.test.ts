/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { defaultOf, hasDefault, toJsonSchema, validate, type ObjectSchema } from "./dsl";

const SCHEMA = {
  kind: "object",
  description: "een testschema",
  fields: {
    name: { kind: "string", minLength: 2, description: "de naam" },
    colour: { kind: "string", format: "hex", default: "#abc", description: "een kleur" },
    mode: { kind: "string", enum: ["a", "b"], default: "a", description: "een modus" },
    count: { kind: "integer", minimum: 0, maximum: 10, default: 0, description: "een aantal" },
    flag: { kind: "boolean", default: false, description: "een vlag" },
    maybe: { kind: "nullable", of: { kind: "string", format: "https-url", description: "een adres" }, default: null, description: "misschien" },
    list: { kind: "array", of: { kind: "string", description: "een item" }, unique: true, default: [], description: "een lijst" },
    nested: { kind: "object", description: "genest", fields: { deep: { kind: "string", default: "x", description: "diep" } } },
    byName: { kind: "map", of: { kind: "integer", description: "een getal" }, keyPattern: /^[a-z]+$/, default: {}, description: "een map" },
    free: { kind: "any", description: "vrij" },
    derivedField: { kind: "string", derived: "uit de naam", description: "afgeleid" },
  },
} as const satisfies ObjectSchema;

function errorsOf(input: unknown): string[] {
  const result = validate(SCHEMA, input);
  return result.ok ? [] : result.errors.map((problem) => `${problem.path}: ${problem.message}`);
}

describe("validate", () => {
  it("vult standaardwaarden in en normaliseert", () => {
    const result = validate(SCHEMA, { name: " Ab ", derivedField: "d" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toEqual({
      name: "Ab",
      colour: "#aabbcc",
      mode: "a",
      count: 0,
      flag: false,
      maybe: null,
      list: [],
      nested: { deep: "x" },
      byName: {},
      free: {},
      derivedField: "d",
    });
  });

  it("noemt het pad en de reden bij elke fout", () => {
    expect(errorsOf({ name: "A", derivedField: "d", extra: 1 })).toEqual([
      "extra: onbekend veld; bekende velden: name, colour, mode, count, flag, maybe, list, nested, byName, free, derivedField",
      "name: moet minstens 2 tekens hebben",
    ]);
    expect(errorsOf({ name: "Ab", derivedField: "d", colour: "rood" })).toEqual(["colour: moet een hexkleur zijn, zoals #1f4e79"]);
    expect(errorsOf({ name: "Ab", derivedField: "d", mode: "c" })).toEqual(["mode: moet een van deze waarden zijn: a, b"]);
    expect(errorsOf({ name: "Ab", derivedField: "d", count: 11 })).toEqual(["count: mag hoogstens 10 zijn"]);
    expect(errorsOf({ name: "Ab", derivedField: "d", count: 1.5 })).toEqual(["count: moet een geheel getal zijn"]);
    expect(errorsOf({ name: "Ab", derivedField: "d", flag: "ja" })).toEqual(["flag: moet true of false zijn"]);
    expect(errorsOf({ name: "Ab", derivedField: "d", maybe: "http://x" })).toEqual(["maybe: moet een adres zijn dat met https:// begint"]);
    expect(errorsOf({ name: "Ab", derivedField: "d", list: ["a", "a"] })).toEqual(["list: bevat een dubbele waarde: a"]);
    expect(errorsOf({ name: "Ab", derivedField: "d", list: ["a", 2] })).toEqual(["list[1]: moet een tekst zijn (tussen aanhalingstekens)"]);
    expect(errorsOf({ name: "Ab", derivedField: "d", byName: { Ab: 1 } })).toEqual(['byName: sleutel "Ab" heeft niet de verwachte vorm (^[a-z]+$)']);
    expect(errorsOf({ name: "Ab", derivedField: "d", nested: { deep: 1 } })).toEqual(["nested.deep: moet een tekst zijn (tussen aanhalingstekens)"]);
    expect(errorsOf({ name: "Ab", derivedField: "d", free: "nee" })).toEqual(["free: moet een object zijn (accolades)"]);
  });

  it("zegt bij een afgeleid veld hoe het afgeleid wordt", () => {
    expect(errorsOf({ name: "Ab" })).toEqual(["derivedField: ontbreekt en kon niet worden afgeleid (uit de naam)"]);
  });

  it("laat null toe bij nullable en valideert anders de binnenkant", () => {
    const ok = validate(SCHEMA, { name: "Ab", derivedField: "d", maybe: "https://voorbeeld.nl/pad" });
    expect(ok.ok && ok.value.maybe).toBe("https://voorbeeld.nl/pad");
  });

  it("negeert alleen op het hoogste niveau de opgegeven sleutels", () => {
    expect(validate(SCHEMA, { $schema: "x", name: "Ab", derivedField: "d" }, { ignoreKeys: ["$schema"] }).ok).toBe(true);
    expect(validate(SCHEMA, { name: "Ab", derivedField: "d", nested: { $schema: "x" } }, { ignoreKeys: ["$schema"] }).ok).toBe(false);
  });

  it("geeft geen waarde terug zolang er fouten zijn", () => {
    const result = validate(SCHEMA, { name: 1 });
    expect(result.ok).toBe(false);
    expect(result.value).toBeUndefined();
  });
});

describe("defaults", () => {
  it("kent een object een standaard toe als al zijn velden er een hebben", () => {
    expect(hasDefault(SCHEMA.fields.nested)).toBe(true);
    expect(defaultOf(SCHEMA.fields.nested)).toEqual({ deep: "x" });
    expect(hasDefault(SCHEMA)).toBe(false);
    expect(defaultOf(SCHEMA.fields.name)).toBeUndefined();
  });
});

describe("toJsonSchema", () => {
  const json = toJsonSchema(SCHEMA);

  it("maakt alleen velden zonder standaard en zonder afleiding verplicht", () => {
    expect(json.required).toEqual(["name"]);
    expect(json.additionalProperties).toBe(false);
  });

  it("vertaalt elke soort", () => {
    const properties = json.properties as Record<string, Record<string, unknown>>;
    expect(properties.colour).toEqual({ description: "een kleur", type: "string", pattern: "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$", default: "#abc" });
    expect(properties.mode?.enum).toEqual(["a", "b"]);
    expect(properties.count).toEqual({ description: "een aantal", type: "integer", minimum: 0, maximum: 10, default: 0 });
    expect(properties.maybe).toEqual({ description: "misschien", anyOf: [{ type: "string", format: "uri", pattern: "^https://" }, { type: "null" }], default: null });
    expect(properties.list?.uniqueItems).toBe(true);
    expect(properties.byName?.propertyNames).toEqual({ pattern: "^[a-z]+$" });
    expect(properties.free).toEqual({ description: "vrij", type: "object", additionalProperties: true });
  });
});
