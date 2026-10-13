/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { isStuck, totalFailed, totalWaiting, type QueueLine } from "./health";

const now = new Date("2026-10-02T12:00:00Z");
const minutesAgo = (minutes: number): Date => new Date(now.getTime() - minutes * 60 * 1000);

function line(overrides: Partial<QueueLine>): QueueLine {
  return { system: "crm", pending: 0, waiting: 0, failed: 0, done: 0, oldestPending: null, lastActivity: null, lastError: null, waitingFor: null, ...overrides };
}

describe("isStuck", () => {
  it("is niets zolang er niets wacht", () => {
    expect(isStuck(line({ done: 12, lastActivity: minutesAgo(600) }), now)).toBe(false);
  });

  it("is geen storing als het wachtende werk jong is", () => {
    expect(isStuck(line({ pending: 1, oldestPending: minutesAgo(10), lastActivity: minutesAgo(10) }), now)).toBe(false);
  });

  it("is geen storing als er oud werk wacht maar er net nog iets gebeurde", () => {
    expect(isStuck(line({ waiting: 1, oldestPending: minutesAgo(180), lastActivity: minutesAgo(5) }), now)).toBe(false);
  });

  it("is een storing als er oud werk wacht en er in diezelfde tijd niets gebeurde", () => {
    expect(isStuck(line({ pending: 1, oldestPending: minutesAgo(90), lastActivity: minutesAgo(90) }), now)).toBe(true);
    expect(isStuck(line({ pending: 1, oldestPending: minutesAgo(90), lastActivity: null }), now)).toBe(true);
  });

  it("volgt de meegegeven grens", () => {
    const old = line({ pending: 1, oldestPending: minutesAgo(30), lastActivity: minutesAgo(30) });
    expect(isStuck(old, now, 15)).toBe(true);
    expect(isStuck(old, now, 60)).toBe(false);
  });
});

describe("tellingen", () => {
  it("tellen wachtend en geblokkeerd bij elkaar, en mislukt apart", () => {
    const lines = [line({ pending: 2, waiting: 1, failed: 3 }), line({ system: "mail", pending: 1, failed: 1 })];
    expect(totalWaiting(lines)).toBe(4);
    expect(totalFailed(lines)).toBe(4);
  });
});
