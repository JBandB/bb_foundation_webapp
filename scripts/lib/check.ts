/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het gereedschap van een checkscript: `pnpm check:<domein>` bewijst gedrag tegen de dev-branch dat
 * een unittest niet kan bewijzen, omdat het in de database zit (een trigger, een constraint, een
 * query) of omdat het pas klopt met echte rijen eromheen.
 *
 * Een checkscript leest als een verhaal: genummerde secties, per regel één bewering, en onderaan de
 * telling. Alles wat schrijft gebeurt in een transactie die wordt teruggedraaid, zodat het script op
 * elke dev-branch herhaalbaar is en niets achterlaat.
 *
 *     const t = createChecker();
 *     await inRollback(db, async (tx) => {
 *       const refused = await expectDbError(tx, (sp) => sp.insert(organisations).values({ name: "Tweede" }), {
 *         constraint: "one_organisation",
 *       });
 *       t.ok("een tweede organisatie wordt geweigerd", refused.matches, refused.detail);
 *     });
 *     t.summary("Kern");
 *
 * Zie scripts/check-core.ts voor het geheel en scripts/check-example.ts als beginpunt voor een eigen check.
 */

import { like } from "drizzle-orm";
import { organisations, users } from "../../lib/db/schema";
import { dbErrorInfo, describeDbError } from "../../lib/db/errors";
import type { ScriptDb } from "./connection";

export interface Checker {
  /** Vergelijkt op JSON-vorm, met bigint als tekst, zodat `1n` en `1n` gelijk zijn en `1` en `1n` niet. */
  check(name: string, actual: unknown, expected: unknown): void;
  ok(name: string, condition: boolean, detail?: string): void;
  section(title: string): void;
  /** Print de telling en zet de exitcode. */
  summary(title: string): void;
  readonly passed: number;
  readonly failed: number;
}

export function createChecker(): Checker {
  let passed = 0;
  let failed = 0;
  const show = (value: unknown): string => JSON.stringify(value, (_key, item: unknown) => (typeof item === "bigint" ? `${item}n` : item));

  return {
    get passed() {
      return passed;
    },
    get failed() {
      return failed;
    },
    check(name, actual, expected) {
      if (show(actual) === show(expected)) {
        passed += 1;
        console.log(`  ok    ${name}`);
        return;
      }
      failed += 1;
      console.log(`  FOUT  ${name}`);
      console.log(`        verwacht ${show(expected)}`);
      console.log(`        kreeg    ${show(actual)}`);
    },
    ok(name, condition, detail) {
      if (condition) {
        passed += 1;
        console.log(`  ok    ${name}`);
        return;
      }
      failed += 1;
      console.log(`  FOUT  ${name}`);
      if (detail !== undefined) console.log(`        ${detail}`);
    },
    section(title) {
      console.log(`\n${title}`);
    },
    summary(title) {
      console.log(`\n${title}: ${passed} ok, ${failed} fout.`);
      if (failed > 0) process.exitCode = 1;
    },
  };
}

class Rollback extends Error {}

/** Draait een blok in een transactie en draait die daarna altijd terug. */
export async function inRollback(db: ScriptDb, run: (tx: ScriptDb) => Promise<void>): Promise<void> {
  try {
    await db.transaction(async (tx) => {
      await run(tx as unknown as ScriptDb);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
}

/**
 * Eén poging in een savepoint, teruggedraaid, met het resultaat terug.
 *
 * Voor een bewering over wat een schrijfactie oplevert zonder dat die blijft staan voor de volgende
 * sectie.
 */
export async function attempt<T>(tx: ScriptDb, run: (sp: ScriptDb) => Promise<T>): Promise<T> {
  let result: T | undefined;
  try {
    await tx.transaction(async (sp) => {
      result = await run(sp as unknown as ScriptDb);
      throw new Rollback();
    });
  } catch (error) {
    if (!(error instanceof Rollback)) throw error;
  }
  return result as T;
}

export interface DbErrorExpectation {
  readonly code?: string;
  readonly constraint?: string;
  readonly messageIncludes?: string;
}

export interface RefusalResult {
  /** Gooide de database? */
  readonly refused: boolean;
  /** Gooide hij om de verwachte reden? */
  readonly matches: boolean;
  /** Wat er gebeurde, voor de regel onder een mislukte bewering. */
  readonly detail: string;
}

/**
 * Verwacht dat de database een statement weigert, en zegt waarom hij dat deed.
 *
 * In een savepoint, zodat een geweigerd statement de rest van de transactie niet meesleept: zonder
 * savepoint strandt alles ná de eerste weigering op "current transaction is aborted".
 */
export async function expectDbError(tx: ScriptDb, run: (sp: ScriptDb) => Promise<unknown>, expectation: DbErrorExpectation): Promise<RefusalResult> {
  try {
    await tx.transaction(async (sp) => {
      await run(sp as unknown as ScriptDb);
      throw new Rollback();
    });
    return { refused: false, matches: false, detail: "de database accepteerde het statement" };
  } catch (error) {
    if (error instanceof Rollback) return { refused: false, matches: false, detail: "de database accepteerde het statement" };
    const info = dbErrorInfo(error);
    const matches =
      info !== undefined &&
      (expectation.code === undefined || info.code === expectation.code) &&
      (expectation.constraint === undefined || info.constraint === expectation.constraint) &&
      (expectation.messageIncludes === undefined || (info.message ?? "").includes(expectation.messageIncludes));
    return { refused: true, matches, detail: describeDbError(error) };
  }
}

export interface CheckContext {
  readonly organisationId: string;
  readonly organisationName: string;
  /** Een dev-account uit de seed, om mee te schrijven. */
  readonly userId: string;
  readonly email: string;
  readonly roles: readonly string[];
}

/** De rijen waar elke check op leunt; ontbreken ze, dan zegt de fout welk script ze neerzet. */
export async function requireContext(db: ScriptDb): Promise<CheckContext> {
  const organisation = (await db.select({ id: organisations.id, name: organisations.name }).from(organisations).limit(1))[0];
  if (organisation === undefined) throw new Error("Er is geen organisatie. Draai eerst pnpm db:bootstrap.");

  const user = (
    await db
      .select({ id: users.id, email: users.email, roles: users.roles })
      .from(users)
      .where(like(users.externalId, "dev:%"))
      .orderBy(users.email)
      .limit(1)
  )[0];
  if (user === undefined) throw new Error("Er is geen dev-account. Draai eerst pnpm db:seed op je dev-branch.");

  return { organisationId: organisation.id, organisationName: organisation.name, userId: user.id, email: user.email, roles: user.roles };
}

/** Een tweede gebruiker dan de eerste, als die er is. */
export async function otherUser(db: ScriptDb, notId: string): Promise<{ id: string; email: string } | undefined> {
  const rows = await db.select({ id: users.id, email: users.email }).from(users).where(like(users.externalId, "dev:%")).orderBy(users.email).limit(5);
  return rows.find((row) => row.id !== notId);
}


