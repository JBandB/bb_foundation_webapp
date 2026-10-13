/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Een kleine schemataal voor de JSON-bestanden van het template: `project.config.json`,
 * `template/manifest.json` en `template.lock.json`. Eén beschrijving doet drie dingen: valideren met
 * een leesbare fout per veld, standaardwaarden invullen en normaliseren, en hetzelfde schema als
 * JSON Schema uitschrijven voor de wizard en de editor.
 *
 * Bewust geen bibliotheek (zod, ajv): de tooling moet werken in een vers project direct na
 * `pnpm install`, zonder extra afhankelijkheden, en de taal hoeft maar drie bestanden te beschrijven.
 * Het type van een gevalideerd document volgt uit het schema (`Infer`), zodat er geen tweede
 * waarheid in de vorm van een losse interface ontstaat.
 */

export type Schema =
  | StringSchema
  | BooleanSchema
  | IntegerSchema
  | NullableSchema
  | ArraySchema
  | ObjectSchema
  | MapSchema
  | AnySchema;

interface Base {
  /** Eén of twee zinnen in gewone taal. Komt in het JSON Schema terecht, en dus in de editor. */
  readonly description: string;
  /**
   * Een veld dat de tooling zelf afleidt als het ontbreekt, met de regel in woorden. Het veld is dan
   * niet verplicht in het JSON Schema; het afleiden gebeurt vóór de validatie, zie config.ts.
   */
  readonly derived?: string;
}

export interface StringSchema extends Base {
  readonly kind: "string";
  readonly enum?: readonly string[];
  readonly pattern?: RegExp;
  /** De uitleg bij het patroon, in gewone taal, voor de foutmelding. */
  readonly patternHint?: string;
  readonly format?: "hex" | "email" | "https-url" | "timezone" | "domain" | "path" | "git-url" | "date";
  readonly minLength?: number;
  readonly maxLength?: number;
  readonly default?: string;
  readonly examples?: readonly string[];
}

export interface BooleanSchema extends Base {
  readonly kind: "boolean";
  readonly default?: boolean;
}

export interface IntegerSchema extends Base {
  readonly kind: "integer";
  readonly minimum?: number;
  readonly maximum?: number;
  readonly const?: number;
  readonly default?: number;
}

export interface NullableSchema extends Base {
  readonly kind: "nullable";
  readonly of: Schema;
  readonly default?: null;
}

export interface ArraySchema extends Base {
  readonly kind: "array";
  readonly of: Schema;
  readonly minItems?: number;
  readonly maxItems?: number;
  readonly unique?: boolean;
  readonly default?: readonly unknown[];
}

export interface ObjectSchema extends Base {
  readonly kind: "object";
  readonly fields: Readonly<Record<string, Schema>>;
}

/** Een object met vrije sleutels die allemaal dezelfde vorm hebben, zoals de modules in het manifest. */
export interface MapSchema extends Base {
  readonly kind: "map";
  readonly of: Schema;
  readonly keyPattern?: RegExp;
  readonly default?: Readonly<Record<string, unknown>>;
}

/** Een object waar de tooling niet in kijkt, zoals de intake van de wizard. */
export interface AnySchema extends Base {
  readonly kind: "any";
}

export type Infer<S> = S extends { readonly kind: "string"; readonly enum: readonly (infer E extends string)[] }
  ? E
  : S extends { readonly kind: "string" }
    ? string
    : S extends { readonly kind: "boolean" }
      ? boolean
      : S extends { readonly kind: "integer" }
        ? number
        : S extends { readonly kind: "nullable"; readonly of: infer O }
          ? Infer<O> | null
          : S extends { readonly kind: "array"; readonly of: infer O }
            ? readonly Infer<O>[]
            : S extends { readonly kind: "object"; readonly fields: infer F }
              ? { readonly [K in keyof F]: Infer<F[K]> }
              : S extends { readonly kind: "map"; readonly of: infer O }
                ? Readonly<Record<string, Infer<O>>>
                : S extends { readonly kind: "any" }
                  ? Readonly<Record<string, unknown>>
                  : never;

export interface Problem {
  /** Het pad naar het veld, zoals `project.slug` of `auth.roles[1].value`. Leeg voor het document. */
  readonly path: string;
  readonly message: string;
}

export type Validated<T> =
  | { readonly ok: true; readonly value: T; readonly errors: readonly [] }
  | { readonly ok: false; readonly value: undefined; readonly errors: readonly Problem[] };

export interface ValidateOptions {
  /** Sleutels op het hoogste niveau die mogen bestaan zonder in het schema te staan, zoals `$schema`. */
  readonly ignoreKeys?: readonly string[];
}

/** Valideert en normaliseert; bij fouten is er geen waarde, zodat niemand met een half document verder gaat. */
export function validate<S extends Schema>(schema: S, input: unknown, options: ValidateOptions = {}): Validated<Infer<S>> {
  const errors: Problem[] = [];
  const value = check(schema, input, "", errors, options.ignoreKeys ?? []);
  if (errors.length > 0) return { ok: false, value: undefined, errors };
  return { ok: true, value: value as Infer<S>, errors: [] };
}

/** De standaardwaarde van een schema, of undefined als het veld verplicht is. */
export function defaultOf(schema: Schema): unknown {
  if ("default" in schema && schema.default !== undefined) return structuredClone(schema.default);
  if (schema.kind === "nullable" && "default" in schema) return null;
  if (schema.kind === "any") return {};
  if (schema.kind === "object") {
    if (!hasDefault(schema)) return undefined;
    const value: Record<string, unknown> = {};
    for (const [name, field] of Object.entries(schema.fields)) value[name] = defaultOf(field);
    return value;
  }
  return undefined;
}

/** Heeft dit schema een standaardwaarde? Een object wel als al zijn velden er een hebben. */
export function hasDefault(schema: Schema): boolean {
  if ("default" in schema) return true;
  if (schema.kind === "any") return true;
  if (schema.kind === "object") return Object.values(schema.fields).every((field) => hasDefault(field));
  return false;
}

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function at(path: string, key: string): string {
  return path === "" ? key : `${path}.${key}`;
}

function check(schema: Schema, input: unknown, path: string, errors: Problem[], ignoreKeys: readonly string[]): unknown {
  switch (schema.kind) {
    case "string":
      return checkString(schema, input, path, errors);
    case "boolean":
      if (typeof input !== "boolean") {
        errors.push({ path, message: "moet true of false zijn" });
        return undefined;
      }
      return input;
    case "integer":
      return checkInteger(schema, input, path, errors);
    case "nullable":
      return input === null ? null : check(schema.of, input, path, errors, ignoreKeys);
    case "array":
      return checkArray(schema, input, path, errors);
    case "object":
      return checkObject(schema, input, path, errors, path === "" ? ignoreKeys : []);
    case "map":
      return checkMap(schema, input, path, errors);
    case "any":
      if (!isPlainObject(input)) {
        errors.push({ path, message: "moet een object zijn (accolades)" });
        return undefined;
      }
      return structuredClone(input);
  }
}

const FORMATS: Record<NonNullable<StringSchema["format"]>, { test(value: string): boolean; message: string; normalise?(value: string): string }> = {
  hex: {
    test: (value) => /^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value),
    message: "moet een hexkleur zijn, zoals #1f4e79",
    normalise: (value) => {
      const lower = value.toLowerCase();
      if (lower.length === 7) return lower;
      const [, r, g, b] = lower;
      return `#${r}${r}${g}${g}${b}${b}`;
    },
  },
  email: {
    test: (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value),
    message: "moet een e-mailadres zijn",
    normalise: (value) => value.toLowerCase(),
  },
  "https-url": {
    test: (value) => /^https:\/\/[^\s/]+(?:\/\S*)?$/.test(value),
    message: "moet een adres zijn dat met https:// begint",
  },
  timezone: {
    test: (value) => {
      try {
        new Intl.DateTimeFormat("en", { timeZone: value });
        return true;
      } catch {
        return false;
      }
    },
    message: "is geen bekende tijdzone (IANA), zoals Europe/Amsterdam",
  },
  domain: {
    test: (value) => /^[a-z0-9-]+(?:\.[a-z0-9-]+)+$/.test(value.toLowerCase()),
    message: "moet een domeinnaam zijn, zoals voorbeeld.nl",
    normalise: (value) => value.toLowerCase(),
  },
  path: {
    test: (value) => /^\/[a-z0-9/-]*$/.test(value),
    message: "moet een pad zijn dat met / begint, in kleine letters, zoals /home",
  },
  "git-url": {
    test: (value) => /^(?:https:\/\/\S+\.git|git@[^:\s]+:\S+\.git|ssh:\/\/\S+\.git)$/.test(value),
    message: "moet een git-adres zijn dat op .git eindigt, zoals https://github.com/org/repo.git",
  },
  date: {
    test: (value) => /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value)),
    message: "moet een datum zijn als jjjj-mm-dd",
  },
};

function checkString(schema: StringSchema, input: unknown, path: string, errors: Problem[]): unknown {
  if (typeof input !== "string") {
    errors.push({ path, message: "moet een tekst zijn (tussen aanhalingstekens)" });
    return undefined;
  }
  let value = input.trim();
  if (schema.enum !== undefined && !schema.enum.includes(value)) {
    errors.push({ path, message: `moet een van deze waarden zijn: ${schema.enum.join(", ")}` });
    return undefined;
  }
  if (schema.minLength !== undefined && value.length < schema.minLength) {
    errors.push({ path, message: `moet minstens ${schema.minLength} teken${schema.minLength === 1 ? "" : "s"} hebben` });
    return undefined;
  }
  if (schema.maxLength !== undefined && value.length > schema.maxLength) {
    errors.push({ path, message: `mag hoogstens ${schema.maxLength} tekens hebben` });
    return undefined;
  }
  if (schema.format !== undefined) {
    const format = FORMATS[schema.format];
    if (!format.test(value)) {
      errors.push({ path, message: format.message });
      return undefined;
    }
    if (format.normalise !== undefined) value = format.normalise(value);
  }
  if (schema.pattern !== undefined && !schema.pattern.test(value)) {
    errors.push({ path, message: schema.patternHint ?? `heeft niet de verwachte vorm (${schema.pattern.source})` });
    return undefined;
  }
  return value;
}

function checkInteger(schema: IntegerSchema, input: unknown, path: string, errors: Problem[]): unknown {
  if (typeof input !== "number" || !Number.isInteger(input)) {
    errors.push({ path, message: "moet een geheel getal zijn" });
    return undefined;
  }
  if (schema.const !== undefined && input !== schema.const) {
    errors.push({ path, message: `moet precies ${schema.const} zijn` });
    return undefined;
  }
  if (schema.minimum !== undefined && input < schema.minimum) {
    errors.push({ path, message: `moet minstens ${schema.minimum} zijn` });
    return undefined;
  }
  if (schema.maximum !== undefined && input > schema.maximum) {
    errors.push({ path, message: `mag hoogstens ${schema.maximum} zijn` });
    return undefined;
  }
  return input;
}

function checkArray(schema: ArraySchema, input: unknown, path: string, errors: Problem[]): unknown {
  if (!Array.isArray(input)) {
    errors.push({ path, message: "moet een lijst zijn (rechte haken)" });
    return undefined;
  }
  if (schema.minItems !== undefined && input.length < schema.minItems) {
    errors.push({ path, message: `moet minstens ${schema.minItems} item${schema.minItems === 1 ? "" : "s"} hebben` });
    return undefined;
  }
  if (schema.maxItems !== undefined && input.length > schema.maxItems) {
    errors.push({ path, message: `mag hoogstens ${schema.maxItems} items hebben` });
    return undefined;
  }
  const before = errors.length;
  const items = input.map((item, index) => check(schema.of, item, `${path}[${index}]`, errors, []));
  if (errors.length > before) return undefined;
  if (schema.unique === true) {
    const seen = new Set<string>();
    for (const item of items) {
      const key = JSON.stringify(item);
      if (seen.has(key)) {
        errors.push({ path, message: `bevat een dubbele waarde: ${typeof item === "string" ? item : key}` });
        return undefined;
      }
      seen.add(key);
    }
  }
  return items;
}

function checkObject(schema: ObjectSchema, input: unknown, path: string, errors: Problem[], ignoreKeys: readonly string[]): unknown {
  if (!isPlainObject(input)) {
    errors.push({ path, message: "moet een object zijn (accolades)" });
    return undefined;
  }
  const known = Object.keys(schema.fields);
  for (const key of Object.keys(input)) {
    if (known.includes(key) || ignoreKeys.includes(key)) continue;
    errors.push({ path: at(path, key), message: `onbekend veld; bekende velden: ${known.join(", ")}` });
  }
  const value: Record<string, unknown> = {};
  for (const [name, field] of Object.entries(schema.fields)) {
    const fieldPath = at(path, name);
    if (input[name] === undefined) {
      const fallback = defaultOf(field);
      if (fallback === undefined) {
        errors.push({
          path: fieldPath,
          message: field.derived === undefined ? "ontbreekt" : `ontbreekt en kon niet worden afgeleid (${field.derived})`,
        });
      } else {
        /* Ook een standaardwaarde gaat door de controle, zodat hij genormaliseerd wordt en een fout erin meteen opvalt. */
        value[name] = check(field, fallback, fieldPath, errors, []);
      }
      continue;
    }
    value[name] = check(field, input[name], fieldPath, errors, []);
  }
  return value;
}

function checkMap(schema: MapSchema, input: unknown, path: string, errors: Problem[]): unknown {
  if (!isPlainObject(input)) {
    errors.push({ path, message: "moet een object zijn met namen als sleutel" });
    return undefined;
  }
  const value: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(input)) {
    if (schema.keyPattern !== undefined && !schema.keyPattern.test(key)) {
      errors.push({ path, message: `sleutel "${key}" heeft niet de verwachte vorm (${schema.keyPattern.source})` });
      continue;
    }
    value[key] = check(schema.of, item, at(path, key), errors, []);
  }
  return value;
}

export type JsonSchema = Record<string, unknown>;

/** Hetzelfde schema als JSON Schema (draft 2020-12), voor de wizard en voor `$schema` in de editor. */
export function toJsonSchema(schema: Schema): JsonSchema {
  const base: JsonSchema = { description: schema.description };
  switch (schema.kind) {
    case "string": {
      const out: JsonSchema = { ...base, type: "string" };
      if (schema.enum !== undefined) out.enum = [...schema.enum];
      if (schema.pattern !== undefined) out.pattern = schema.pattern.source;
      if (schema.format !== undefined) {
        const pattern = JSON_SCHEMA_FORMATS[schema.format];
        if (pattern !== undefined) out.pattern = pattern;
        if (schema.format === "email") out.format = "email";
        if (schema.format === "https-url") out.format = "uri";
        if (schema.format === "date") out.format = "date";
      }
      if (schema.minLength !== undefined) out.minLength = schema.minLength;
      if (schema.maxLength !== undefined) out.maxLength = schema.maxLength;
      if (schema.default !== undefined) out.default = schema.default;
      if (schema.examples !== undefined) out.examples = [...schema.examples];
      return out;
    }
    case "boolean":
      return schema.default === undefined ? { ...base, type: "boolean" } : { ...base, type: "boolean", default: schema.default };
    case "integer": {
      const out: JsonSchema = { ...base, type: "integer" };
      if (schema.const !== undefined) out.const = schema.const;
      if (schema.minimum !== undefined) out.minimum = schema.minimum;
      if (schema.maximum !== undefined) out.maximum = schema.maximum;
      if (schema.default !== undefined) out.default = schema.default;
      return out;
    }
    case "nullable": {
      const inner = toJsonSchema(schema.of);
      delete inner.description;
      const out: JsonSchema = { ...base, anyOf: [inner, { type: "null" }] };
      if ("default" in schema) out.default = null;
      return out;
    }
    case "array": {
      const out: JsonSchema = { ...base, type: "array", items: toJsonSchema(schema.of) };
      if (schema.minItems !== undefined) out.minItems = schema.minItems;
      if (schema.maxItems !== undefined) out.maxItems = schema.maxItems;
      if (schema.unique === true) out.uniqueItems = true;
      if (schema.default !== undefined) out.default = structuredClone(schema.default);
      return out;
    }
    case "object": {
      const properties: JsonSchema = {};
      const required: string[] = [];
      for (const [name, field] of Object.entries(schema.fields)) {
        properties[name] = toJsonSchema(field);
        if (!hasDefault(field) && field.derived === undefined) required.push(name);
      }
      const out: JsonSchema = { ...base, type: "object", properties, additionalProperties: false };
      if (required.length > 0) out.required = required;
      return out;
    }
    case "map": {
      const out: JsonSchema = { ...base, type: "object", additionalProperties: toJsonSchema(schema.of) };
      if (schema.keyPattern !== undefined) out.propertyNames = { pattern: schema.keyPattern.source };
      if (schema.default !== undefined) out.default = structuredClone(schema.default);
      return out;
    }
    case "any":
      return { ...base, type: "object", additionalProperties: true };
  }
}

/** De patronen die een JSON Schema-validator kan narekenen; de tijdzone kan dat niet en blijft een tekst. */
const JSON_SCHEMA_FORMATS: Record<NonNullable<StringSchema["format"]>, string | undefined> = {
  hex: "^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$",
  email: undefined,
  "https-url": "^https://",
  timezone: undefined,
  domain: "^[a-zA-Z0-9-]+(?:\\.[a-zA-Z0-9-]+)+$",
  path: "^/[a-z0-9/-]*$",
  "git-url": "\\.git$",
  date: "^\\d{4}-\\d{2}-\\d{2}$",
};

/** Problemen als leesbare regels, voor de terminal. */
export function formatProblems(problems: readonly Problem[]): string {
  return problems.map((problem) => (problem.path === "" ? `  ${problem.message}` : `  ${problem.path}: ${problem.message}`)).join("\n");
}
