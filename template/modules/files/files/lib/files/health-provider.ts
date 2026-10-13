/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { labels } from "@/lib/i18n/labels";
import type { HealthProvider } from "@/lib/integrations/health";
import { isConfigured, missingConfig } from "./blob";
import { FILE_PURPOSES } from "./purposes";

export const SAS_EXPIRES_VAR = "BLOB_SAS_EXPIRES";

/** Hoeveel dagen het token nog geldig is volgens BLOB_SAS_EXPIRES (jjjj-mm-dd); null als het niet is ingevuld. */
export function sasDaysLeft(now: Date = new Date()): number | null {
  const expires = (process.env[SAS_EXPIRES_VAR] ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(expires)) return null;
  return Math.round((new Date(`${expires}T00:00:00Z`).getTime() - now.getTime()) / 86_400_000);
}

/**
 * De opslag op Beheer, Systeem: ingericht voor elk doel, en hoe lang het token nog geldig is. Zonder
 * aanroep naar buiten: een pagina openen mag geen upload doen. De echte proef is pnpm blob:status.
 */
export const filesHealth: HealthProvider = {
  name: labels.files.healthName,
  check: async () => {
    const purposes = Object.keys(FILE_PURPOSES);
    const missing = purposes.filter((purpose) => !isConfigured(purpose));
    if (missing.length > 0) {
      const names = [...new Set(missing.flatMap((purpose) => missingConfig(purpose)))];
      return { status: "warning", detail: labels.files.healthMissing(names) };
    }
    const days = sasDaysLeft();
    if (days === null) return { status: "warning", detail: labels.files.healthNoExpiry };
    if (days < 0) return { status: "error", detail: labels.files.healthExpired };
    if (days <= 30) return { status: "warning", detail: labels.files.healthExpiresSoon(days) };
    return { status: "ok", detail: labels.files.healthOk(purposes.length, days) };
  },
};
