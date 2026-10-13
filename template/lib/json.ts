/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * JSON lezen en schrijven voor de patchers: één foutmelding met de bestandsnaam erin, en één
 * schrijfvorm (twee spaties, LF aan het eind), zodat een gepatcht bestand er altijd hetzelfde uitziet.
 */
import { isPlainObject } from "./dsl";

export function parseJsonObject(text: string, label: string): Record<string, unknown> {
  let value: unknown;
  try {
    value = JSON.parse(text);
  } catch (error) {
    throw new Error(`${label} is geen geldige JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
  if (!isPlainObject(value)) throw new Error(`${label} moet een object zijn (accolades)`);
  return value;
}

export function stringifyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

/** Een object met de sleutels in de volgorde van `first`, en daarna de rest in hun eigen volgorde. */
export function withKeyOrder(value: Readonly<Record<string, unknown>>, first: readonly string[]): Record<string, unknown> {
  const ordered: Record<string, unknown> = {};
  for (const key of first) if (value[key] !== undefined) ordered[key] = value[key];
  for (const [key, item] of Object.entries(value)) if (!(key in ordered) && item !== undefined) ordered[key] = item;
  return ordered;
}

/** Een record met de sleutels gesorteerd op code units. */
export function sortedRecord<T>(value: Readonly<Record<string, T>>): Record<string, T> {
  return Object.fromEntries(Object.entries(value).sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)));
}
