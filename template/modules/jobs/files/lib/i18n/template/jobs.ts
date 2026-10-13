/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import type { Widen } from "./en";

/**
 * De teksten van de module jobs, in beide talen. Komen via het gegenereerde register onder
 * `labels.jobs`. `nl` is de sleutelbron; `en` moet dezelfde sleutels hebben (jobs.test.ts).
 */
interface RunSummary {
  readonly done: number;
  readonly waiting: number;
  readonly retried: number;
  readonly failed: number;
}

const nl = {
  tab: "Achtergrondwerk",
  title: "Achtergrondwerk",
  intro:
    "Elke schrijfactie naar buiten staat hier in de rij, met een sleutel die dubbel werk voorkomt. De rij wordt verwerkt direct na de handeling die hem vulde en elke nacht door de cron; op Vercel Pro kan dat elk kwartier.",
  queueTitle: "De wachtrij per systeem",
  colSystem: "Systeem",
  colPending: "Wacht",
  colWaiting: "Geblokkeerd",
  colFailed: "Mislukt",
  colDone: "Klaar",
  colLastActivity: "Laatste activiteit",
  oldest: "oudste",
  never: "nog nooit",
  stuck: "vastgelopen",
  nothing: "Er staat niets in de rij.",
  flush: "Verwerk wat klaarstaat",
  flushing: "Bezig",
  flushDone: (run: RunSummary) => `Verwerkt: ${run.done} klaar, ${run.waiting} wacht op iets anders, ${run.retried} komt terug, ${run.failed} mislukt.`,
  retry: "Mislukte taken opnieuw",
  retryDone: (count: number) => (count === 1 ? "Eén taak staat weer klaar." : `${count} taken staan weer klaar.`),
  healthName: "Achtergrondwerk",
  healthDetail: (pending: number, failed: number) => `${pending} in de rij, ${failed} mislukt.`,
  healthStuck: "Er wacht al meer dan een uur werk zonder dat er iets gebeurt.",
};

const en = {
  tab: "Background work",
  title: "Background work",
  intro:
    "Every write to an external system waits here, with a key that prevents duplicate work. The queue is processed right after the action that filled it and every night by the cron job; on Vercel Pro that can be every quarter of an hour.",
  queueTitle: "The queue per system",
  colSystem: "System",
  colPending: "Pending",
  colWaiting: "Blocked",
  colFailed: "Failed",
  colDone: "Done",
  colLastActivity: "Last activity",
  oldest: "oldest",
  never: "never",
  stuck: "stuck",
  nothing: "The queue is empty.",
  flush: "Process what is waiting",
  flushing: "Working",
  flushDone: (run: RunSummary) => `Processed: ${run.done} done, ${run.waiting} waiting on something else, ${run.retried} will be retried, ${run.failed} failed.`,
  retry: "Retry failed jobs",
  retryDone: (count: number) => (count === 1 ? "One job is queued again." : `${count} jobs are queued again.`),
  healthName: "Background work",
  healthDetail: (pending: number, failed: number) => `${pending} queued, ${failed} failed.`,
  healthStuck: "Work has been waiting for over an hour without anything happening.",
} satisfies Widen<typeof nl>;

export const jobsLabels: Readonly<Record<"nl" | "en", Widen<typeof nl>>> = { nl, en };
