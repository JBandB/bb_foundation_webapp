/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { getDb } from "@/lib/db/client";
import { organisations } from "@/lib/db/schema";
import { labels } from "@/lib/i18n/labels";
import type { HealthProvider } from "@/lib/integrations/health";
import { isStuck } from "@/lib/jobs/health";
import { loadOutboxLine } from "./stuck-alerts";
import { mailTransport } from "./transport";

/** Mail en meldingen op Beheer, Systeem: is het transport ingericht, en wat wacht of mislukte er. */
export const messagingHealth: HealthProvider = {
  name: labels.messaging.healthName,
  check: async () => {
    if (!mailTransport.configured()) return { status: "warning", detail: labels.messaging.healthMissing(mailTransport.name, mailTransport.missing()) };

    const db = getDb();
    const organisation = (await db.select({ id: organisations.id }).from(organisations).limit(1))[0];
    if (organisation === undefined) return { status: "off", detail: labels.messaging.none };

    const line = await loadOutboxLine(db, organisation.id);
    const pending = line?.pending ?? 0;
    const failed = line?.failed ?? 0;
    const detail = labels.messaging.healthDetail(mailTransport.name, pending, failed);
    if (line !== null && isStuck(line, new Date())) return { status: "error", detail };
    if (failed > 0) return { status: "warning", detail };
    return { status: "ok", detail };
  },
};
