/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wat een beheerder per berichtsoort instelt: aan of uit, naar wie, en de drempel. Geen rij in
 * `notification_settings` betekent de standaard uit de catalogus; een opgeslagen doelgroep die niet
 * meer bij de soort past valt terug op de standaard, zodat een wijziging in de catalogus niets
 * breekt. Schrijven kan alleen met het recht `admin:messages` en laat een auditregel achter.
 */
import { and, eq, sql } from "drizzle-orm";
import type { Actor } from "@/lib/auth/actor";
import { assertCan } from "@/lib/auth/can";
import { appendAuditLog } from "@/lib/db/audit";
import type { DbOrTransaction } from "@/lib/db/client";
import { notificationSettings } from "@/lib/db/schema";
import { kindFor, isKnownKind, MESSAGE_KINDS, parseThreshold, toAudience, type MessageAudience, type ThresholdResult } from "./kinds";

export interface ResolvedSetting {
  readonly kind: string;
  readonly enabled: boolean;
  readonly audience: MessageAudience;
  /** De drempel in de eenheid van de soort; undefined als de soort er geen heeft. */
  readonly threshold: number | undefined;
  /** Nog nooit door een mens aangeraakt. */
  readonly isDefault: boolean;
}

export type MessageSettings = Readonly<Record<string, ResolvedSetting>>;

export interface StoredSetting {
  readonly kind: string;
  readonly enabled: boolean;
  readonly audience: string;
  readonly thresholdValue: number | null;
}

/** Puur: de rijen uit de database over de catalogus heen gelegd. */
export function mergeSettings(rows: readonly StoredSetting[]): MessageSettings {
  const merged: Record<string, ResolvedSetting> = {};
  for (const kind of MESSAGE_KINDS) {
    const stored = rows.find((row) => row.kind === kind.key);
    const audience = toAudience(stored?.audience);
    const spec = kind.threshold;
    const value = stored?.thresholdValue ?? null;
    const usable = spec !== undefined && value !== null && value >= spec.min && value <= spec.max;
    merged[kind.key] = {
      kind: kind.key,
      enabled: stored?.enabled ?? true,
      audience: audience !== undefined && kind.audiences.includes(audience) ? audience : kind.defaultAudience,
      threshold: spec === undefined ? undefined : usable ? value : spec.fallback,
      isDefault: stored === undefined,
    };
  }
  return merged;
}

export async function loadSettings(db: DbOrTransaction, organisationId: string): Promise<MessageSettings> {
  const rows = await db
    .select({ kind: notificationSettings.kind, enabled: notificationSettings.enabled, audience: notificationSettings.audience, thresholdValue: notificationSettings.thresholdValue })
    .from(notificationSettings)
    .where(eq(notificationSettings.organisationId, organisationId));
  return mergeSettings(rows);
}

/** De instelling van één soort, met de standaard als er niets is opgeslagen. */
export function settingFor(settings: MessageSettings, kind: string): ResolvedSetting {
  const setting = settings[kind];
  if (setting === undefined) throw new Error(`Onbekende berichtsoort "${kind}"`);
  return setting;
}

export interface SettingInput {
  readonly kind: string;
  readonly enabled: boolean;
  readonly audience: string;
  readonly threshold: string;
}

export interface SettingTexts {
  readonly unknownKind: string;
  readonly badAudience: string;
  readonly threshold: Readonly<Record<Exclude<ThresholdResult, { ok: true }>["reason"], string>>;
}

export type SettingResult = { readonly ok: true } | { readonly ok: false; readonly errors: Readonly<Record<string, string>> };

export async function saveSetting(db: DbOrTransaction, actor: Actor, input: SettingInput, texts: SettingTexts): Promise<SettingResult> {
  assertCan(actor, "admin:messages");
  if (!isKnownKind(input.kind)) return { ok: false, errors: { kind: texts.unknownKind } };
  const kind = kindFor(input.kind);
  const audience = toAudience(input.audience);
  if (audience === undefined || !kind.audiences.includes(audience)) return { ok: false, errors: { audience: texts.badAudience } };

  let thresholdValue: number | null = null;
  if (kind.threshold !== undefined) {
    const parsed = parseThreshold(kind, input.threshold);
    if (!parsed.ok) return { ok: false, errors: { threshold: texts.threshold[parsed.reason] } };
    thresholdValue = parsed.value;
  }

  const before = (
    await db
      .select({ kind: notificationSettings.kind, enabled: notificationSettings.enabled, audience: notificationSettings.audience, thresholdValue: notificationSettings.thresholdValue })
      .from(notificationSettings)
      .where(and(eq(notificationSettings.organisationId, actor.organisationId), eq(notificationSettings.kind, kind.key)))
      .limit(1)
  )[0];
  const after = { kind: kind.key, enabled: input.enabled, audience, thresholdValue };

  await db
    .insert(notificationSettings)
    .values({ organisationId: actor.organisationId, ...after })
    .onConflictDoUpdate({ target: [notificationSettings.organisationId, notificationSettings.kind], set: { ...after, updatedAt: sql`now()` } });
  await appendAuditLog(db, actor, {
    entityTable: "notification_settings",
    entityId: actor.organisationId,
    action: before === undefined ? "insert" : "update",
    ...(before === undefined ? {} : { before }),
    after,
  });
  return { ok: true };
}
