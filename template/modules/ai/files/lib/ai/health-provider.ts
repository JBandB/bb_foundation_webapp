/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { getDb } from "@/lib/db/client";
import { organisations } from "@/lib/db/schema";
import { labels } from "@/lib/i18n/labels";
import type { HealthProvider } from "@/lib/integrations/health";
import { aiKey, AI_KEY_ENV } from "./client";
import { loadPromptSettings } from "./settings";
import { todayLine } from "./usage";

/**
 * AI op Beheer, Systeem: is er een sleutel, staat er een prompt aan, en ging er vandaag iets mis. Deze
 * controle roept de API niet aan: dat kost geld. Een proef met de echte sleutel doe je met pnpm ai:test.
 */
export const aiHealth: HealthProvider = {
  name: labels.ai.healthName,
  check: async () => {
    if (aiKey() === undefined) return { status: "warning", detail: labels.ai.healthNoKey(AI_KEY_ENV) };

    const db = getDb();
    const organisation = (await db.select({ id: organisations.id }).from(organisations).limit(1))[0];
    if (organisation === undefined) return { status: "off", detail: labels.ai.healthNoPrompts };

    const enabled = (await loadPromptSettings(db, organisation.id)).filter((setting) => setting.enabled).length;
    if (enabled === 0) return { status: "off", detail: labels.ai.healthNoPrompts };

    const today = await todayLine(db, organisation.id);
    const detail = labels.ai.healthDetail(enabled, today.requests, today.failed);
    return { status: today.failed > 0 ? "warning" : "ok", detail };
  },
};
