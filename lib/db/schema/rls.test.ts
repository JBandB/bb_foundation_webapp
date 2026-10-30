/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { is } from "drizzle-orm";
import { getTableConfig, PgTable } from "drizzle-orm/pg-core";
import { describe, expect, it } from "vitest";
import * as schema from "@/lib/db/schema";
import { APP_ROW_POLICY } from "./rls";

/**
 * Elke tabel draagt de regel van de app. Zie de kop van `rls.ts`.
 *
 * **Waarom dit een test is en geen controle in de database.** Een tabel zonder regel heeft geen slot
 * en is dan voor elke rol met rechten te lezen; een tabel met slot en zonder regel is voor de app
 * leeg. Allebei ziet geen enkele andere test, want die werken als eigenaar, en de eigenaar gaat
 * altijd langs het slot. Deze test faalt bij de PR die de tabel toevoegt, met de naam erbij. Hij
 * loopt over alles wat `@/lib/db/schema` exporteert, dus ook over de eigen tabellen van het project.
 */
describe("Row Level Security", () => {
  const exported: unknown[] = Object.values(schema);
  const tables = exported.filter((value): value is PgTable => is(value, PgTable));

  it("vindt de tabellen van het schema", () => {
    /* De zes van core; een module of het project voegt er alleen aan toe. */
    expect(tables.length).toBeGreaterThanOrEqual(6);
  });

  it("geeft elke tabel de regel van de app, en geen andere", () => {
    for (const table of tables) {
      const config = getTableConfig(table);
      expect(
        config.policies.map((policy) => policy.name),
        `${config.schema ?? "public"}.${config.name} mist appRowAccess() in zijn blok met indexen (lib/db/schema/rls.ts)`,
      ).toEqual([APP_ROW_POLICY]);
    }
  });
});
