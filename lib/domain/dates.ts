/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Datums als `jjjj-mm-dd`, in de tijdzone van het project. Alle tijdstippen in de database zijn UTC
 * (CLAUDE.md regel 3); een datum is iets anders dan een tijdstip en wordt hier afgeleid via `Intl`,
 * nooit via de klok van de server.
 */
import { PROJECT } from "@/lib/project/config.generated";

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Is dit een echte datum als jjjj-mm-dd? `2026-02-30` is het niet. */
export function isIsoDate(value: string): boolean {
  if (!ISO_DATE.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return false;
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

/** De datum van een tijdstip in de tijdzone van het project, als jjjj-mm-dd. */
export function dateIn(instant: Date, timezone: string = PROJECT.timezone): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).format(instant);
}

/** Vandaag in de tijdzone van het project. */
export function todayIso(now: Date = new Date()): string {
  return dateIn(now);
}

/** Een datum voor op het scherm, in de locale van het project: "2 oktober 2026". */
export function formatDate(isoDate: string, options: Intl.DateTimeFormatOptions = { day: "numeric", month: "long", year: "numeric" }): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  if (year === undefined || month === undefined || day === undefined) return isoDate;
  return new Intl.DateTimeFormat(PROJECT.locale, { ...options, timeZone: "UTC" }).format(new Date(Date.UTC(year, month - 1, day)));
}

/** Een tijdstip voor op het scherm, in de tijdzone en de locale van het project: "2 okt 2026, 14:05". */
export function formatInstant(instant: Date): string {
  return new Intl.DateTimeFormat(PROJECT.locale, {
    timeZone: PROJECT.timezone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}
