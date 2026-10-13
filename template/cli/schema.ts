/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm template:schema`: schrijft het JSON Schema van project.config.json, afgeleid uit de schemataal.
 * De wizard volgt dit schema en de editor valideert er live tegen via de `$schema`-regel in het
 * configuratiebestand. De zelftest van het template faalt als het bestand achterloopt op de code.
 */
import { join } from "node:path";
import { PROJECT_CONFIG_SCHEMA } from "../lib/config-schema";
import { toJsonSchema } from "../lib/dsl";
import { writeText } from "../lib/files";
import { stringifyJson } from "../lib/json";

export const SCHEMA_FILE = "template/schema/project.config.schema.json";

export function projectConfigJsonSchema(): Record<string, unknown> {
  const schema = toJsonSchema(PROJECT_CONFIG_SCHEMA);
  const properties = schema.properties;
  return {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    title: "project.config.json",
    ...schema,
    properties: {
      $schema: { type: "string", description: "De verwijzing naar dit schema, zodat de editor live valideert." },
      ...(typeof properties === "object" && properties !== null ? properties : {}),
    },
  };
}

export function renderSchemaFile(): string {
  return stringifyJson(projectConfigJsonSchema());
}

export function writeSchemaFile(root: string): string {
  writeText(join(root, SCHEMA_FILE), renderSchemaFile());
  return SCHEMA_FILE;
}
