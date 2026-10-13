/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De catalogus van berichtsoorten: wat de tool kan versturen, via welk kanaal, naar wie standaard,
 * en of er een drempel bij hoort. Een beheerder zet per soort aan of uit, kiest de doelgroep en de
 * drempel op Beheer, Berichten; wat hij niet instelt, komt hieruit.
 *
 * De kern brengt zijn eigen soorten mee (CORE_KINDS); het project voegt de zijne toe in
 * lib/messaging/catalogue.ts (een seed). Een soort die hier niet staat, kan niet verstuurd worden:
 * `enqueueKind` gooit dan, want een onbekende soort is een programmeerfout en geen storing.
 */
import type { AppRole } from "@/lib/auth/roles";
import { APP_ROLES } from "@/lib/auth/roles";
import { PROJECT_KINDS } from "./catalogue";

export type MessageChannel = "mail" | "teams";

/**
 * Naar wie: alle beheerders, één persoon (de aanroeper geeft het adres mee), of iedereen met een
 * rol. Adressering, geen autorisatie: wie een bericht krijgt, mag daarmee nog niets.
 */
export type MessageAudience = "admins" | "person" | `role:${AppRole}`;

export type ThresholdUnit = "pct" | "minutes" | "days" | "count";

export interface ThresholdSpec {
  readonly unit: ThresholdUnit;
  readonly min: number;
  readonly max: number;
  readonly fallback: number;
}

export interface MessageKind {
  /** De sleutel, in snake_case, zoals `integration_stuck`. Komt in `outbox.kind` en in de instellingen. */
  readonly key: string;
  readonly channel: MessageChannel;
  /** De doelgroepen die bij deze soort kunnen; `person` alleen als de aanroeper altijd een adres meegeeft. */
  readonly audiences: readonly MessageAudience[];
  readonly defaultAudience: MessageAudience;
  readonly threshold?: ThresholdSpec;
}

/** De soorten van de kern en van de modules die de kern kent. */
export const CORE_KINDS: readonly MessageKind[] = [
  /* Werk dat stilstaat in de wachtrij of de outbox; één keer per dag per ontvanger. */
  { key: "integration_stuck", channel: "mail", audiences: ["admins"], defaultAudience: "admins", threshold: { unit: "minutes", min: 15, max: 1440, fallback: 60 } },
  /* Een melding over de tool zelf (de feedbackknop). */
  { key: "tool_feedback", channel: "mail", audiences: ["admins"], defaultAudience: "admins" },
  /* Iemand komt er op het inlogscherm niet in en vraagt hulp. */
  { key: "login_help", channel: "mail", audiences: ["admins"], defaultAudience: "admins" },
  /* De wachtwoordlogin: een uitnodiging en een herstelkoppeling gaan altijd naar één persoon. */
  { key: "account_invite", channel: "mail", audiences: ["person"], defaultAudience: "person" },
  { key: "password_reset", channel: "mail", audiences: ["person"], defaultAudience: "person" },
  /* Tweestapsverificatie instellen bij de eerste login als die voor de rol verplicht is. */
  { key: "mfa_setup", channel: "mail", audiences: ["person"], defaultAudience: "person" },
];

export const MESSAGE_KINDS: readonly MessageKind[] = [...CORE_KINDS, ...PROJECT_KINDS];

export function kindFor(key: string): MessageKind {
  const kind = MESSAGE_KINDS.find((candidate) => candidate.key === key);
  if (kind === undefined) throw new Error(`Onbekende berichtsoort "${key}"; zet hem in lib/messaging/catalogue.ts.`);
  return kind;
}

export function isKnownKind(key: string): boolean {
  return MESSAGE_KINDS.some((candidate) => candidate.key === key);
}

/** De doelgroepen die in dit project bestaan: beheerders, een persoon, en één per rol. */
export const MESSAGE_AUDIENCES: readonly MessageAudience[] = ["admins", "person", ...APP_ROLES.map((role) => `role:${role}` as const)];

export function toAudience(raw: string | undefined): MessageAudience | undefined {
  return MESSAGE_AUDIENCES.find((audience) => audience === raw);
}

export type ThresholdResult = { readonly ok: true; readonly value: number } | { readonly ok: false; readonly reason: "none" | "notANumber" | "quarters" | "outOfRange" };

/**
 * Een drempel uit een formulier: uren gaan in kwartieren en worden minuten; de rest is een heel
 * getal binnen de grenzen van de soort.
 */
export function parseThreshold(kind: MessageKind, raw: string): ThresholdResult {
  const spec = kind.threshold;
  if (spec === undefined) return { ok: false, reason: "none" };
  const cleaned = raw.trim().replace(",", ".");
  const entered = Number(cleaned);
  if (cleaned === "" || !Number.isFinite(entered)) return { ok: false, reason: "notANumber" };

  if (spec.unit === "minutes") {
    const minutes = entered * 60;
    if (!Number.isInteger(minutes) || minutes % 15 !== 0) return { ok: false, reason: "quarters" };
    return withinRange(spec, minutes);
  }
  if (!Number.isInteger(entered)) return { ok: false, reason: "notANumber" };
  return withinRange(spec, entered);
}

/** De drempel zoals hij in het formulier staat: minuten als uren. */
export function thresholdInput(kind: MessageKind, value: number): string {
  if (kind.threshold?.unit !== "minutes") return String(value);
  const hours = value / 60;
  return Number.isInteger(hours) ? String(hours) : String(hours).replace(".", ",");
}

function withinRange(spec: ThresholdSpec, value: number): ThresholdResult {
  if (value < spec.min || value > spec.max) return { ok: false, reason: "outOfRange" };
  return { ok: true, value };
}

/**
 * De catalogus is intern consistent: unieke sleutels, de standaarddoelgroep hoort bij de soort, een
 * drempel heeft zinnige grenzen. Wordt aangeroepen door de test en door check:messaging.
 */
export function catalogueProblems(kinds: readonly MessageKind[] = MESSAGE_KINDS): string[] {
  const problems: string[] = [];
  const seen = new Set<string>();
  for (const kind of kinds) {
    if (!/^[a-z][a-z0-9_]*$/.test(kind.key)) problems.push(`${kind.key}: een sleutel is snake_case`);
    if (seen.has(kind.key)) problems.push(`${kind.key}: komt twee keer voor`);
    seen.add(kind.key);
    if (kind.audiences.length === 0) problems.push(`${kind.key}: geen doelgroepen`);
    if (!kind.audiences.includes(kind.defaultAudience)) problems.push(`${kind.key}: de standaarddoelgroep staat niet bij de doelgroepen`);
    for (const audience of kind.audiences) {
      if (!MESSAGE_AUDIENCES.includes(audience)) problems.push(`${kind.key}: onbekende doelgroep ${audience}`);
    }
    const spec = kind.threshold;
    if (spec !== undefined && (spec.min <= 0 || spec.max < spec.min || spec.fallback < spec.min || spec.fallback > spec.max)) {
      problems.push(`${kind.key}: de drempel heeft geen zinnige grenzen`);
    }
  }
  return problems;
}
