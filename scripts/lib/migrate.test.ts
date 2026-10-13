/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { join } from "node:path";
import { readMigrationFiles } from "drizzle-orm/migrator";
import { describe, expect, it } from "vitest";
import { readJournal, readMigration } from "./migrate";

/**
 * Onze migratieloop schrijft in dezelfde tabel als drizzle en met dezelfde hash.
 *
 * Dat is de enige eis die er echt toe doet aan de vervanging uit `migrate.ts`: een database die
 * eerder met `drizzle-kit migrate` is bijgewerkt, moet hier gewoon verderlopen. Wijkt de hash af, dan
 * denkt de ene loop dat er nog van alles openstaat wat de andere al heeft gedaan, en dan draait een
 * migratie twee keer.
 *
 * Deze test raakt geen database: hij leest dezelfde bestanden als beide loops.
 */
describe("de migratieloop leest hetzelfde als drizzle", () => {
  const theirs = readMigrationFiles({ migrationsFolder: join(process.cwd(), "lib", "db", "migrations") });
  const ours = readJournal().map(readMigration);

  it("kent evenveel migraties, en minstens de twee van het template", () => {
    expect(ours.length).toBe(theirs.length);
    expect(ours.length).toBeGreaterThanOrEqual(2);
  });

  it("berekent dezelfde hash, in dezelfde volgorde", () => {
    expect(ours.map((row) => row.hash)).toEqual(theirs.map((row) => row.hash));
  });

  it("gebruikt dezelfde tijdstempel als sleutel", () => {
    expect(ours.map((row) => row.when)).toEqual(theirs.map((row) => row.folderMillis));
  });

  it("levert per migratie minstens één statement", () => {
    for (const migration of ours) {
      expect(migration.statements.length, migration.tag).toBeGreaterThan(0);
    }
  });
});
