/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { getDb } from "@/lib/db/client";
import { organisations } from "@/lib/db/schema";
import { labels } from "@/lib/i18n/labels";
import type { HealthProvider } from "@/lib/integrations/health";
import { isStuck, loadJobsHealth, totalFailed, totalWaiting } from "./health";

/**
 * De wachtrij in de koppelingenlijst op Beheer, Systeem: hoeveel er wacht, hoeveel er mislukt is,
 * en of er iets vastzit. Leest alleen de database en raakt niets van buiten.
 */
export const jobsHealth: HealthProvider = {
  name: labels.jobs.healthName,
  check: async () => {
    const db = getDb();
    const organisation = (await db.select({ id: organisations.id }).from(organisations).limit(1))[0];
    if (organisation === undefined) return { status: "off", detail: labels.jobs.nothing };

    const lines = await loadJobsHealth(db, organisation.id);
    const now = new Date();
    const detail = labels.jobs.healthDetail(totalWaiting(lines), totalFailed(lines));
    if (lines.some((line) => isStuck(line, now))) return { status: "error", detail: `${detail} ${labels.jobs.healthStuck}` };
    if (totalFailed(lines) > 0) return { status: "warning", detail };
    return { status: "ok", detail };
  },
};
