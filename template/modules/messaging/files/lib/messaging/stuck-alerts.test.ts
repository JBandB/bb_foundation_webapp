/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import type { QueueLine } from "@/lib/jobs/health";
import { stuckSignals } from "./stuck-alerts";

const now = new Date("2026-10-02T12:00:00Z");
const minutesAgo = (minutes: number): Date => new Date(now.getTime() - minutes * 60 * 1000);
const line = (overrides: Partial<QueueLine>): QueueLine => ({ system: "crm", pending: 0, waiting: 0, failed: 0, done: 0, oldestPending: null, lastActivity: null, lastError: null, waitingFor: null, ...overrides });

describe("stuckSignals", () => {
  it("meldt een systeem in de wachtrij dat stilstaat en de outbox als die stilstaat, elk één keer", () => {
    const signals = stuckSignals({
      jobs: [line({ pending: 2, waiting: 1, oldestPending: minutesAgo(120), lastActivity: minutesAgo(120) }), line({ system: "ok", pending: 1, oldestPending: minutesAgo(5), lastActivity: minutesAgo(5) })],
      outbox: line({ system: "outbox", pending: 4, oldestPending: minutesAgo(90), lastActivity: minutesAgo(90) }),
      thresholdMinutes: 60,
      now,
    });
    expect(signals).toEqual([
      { name: "jobs:crm", waiting: 3 },
      { name: "outbox", waiting: 4 },
    ]);
  });

  it("zwijgt als er niets wacht of als er net nog iets gebeurde", () => {
    expect(stuckSignals({ jobs: [line({ done: 3, lastActivity: minutesAgo(600) })], outbox: null, thresholdMinutes: 60, now })).toEqual([]);
    expect(stuckSignals({ jobs: [line({ pending: 1, oldestPending: minutesAgo(600), lastActivity: minutesAgo(2) })], outbox: null, thresholdMinutes: 60, now })).toEqual([]);
  });
});
