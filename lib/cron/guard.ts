/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De poortwachter voor cronroutes.
 *
 * Elke cronroute begint hiermee, en dat mag in geen enkele ontbreken: een cronroute zonder controle is
 * een openbare URL die de administratie van iedereen raakt. Vercel stuurt `CRON_SECRET` mee als bearer
 * token bij elke cronaanroep.
 */

import { createHash, timingSafeEqual } from "node:crypto";
import { getDb } from "@/lib/db/client";
import { organisations } from "@/lib/db/schema";

export type CronContext = { readonly ok: true; readonly organisationId: string } | { readonly ok: false; readonly response: Response };

/**
 * Controleert het token en haalt de organisatie op.
 *
 * Fail closed: ontbreekt `CRON_SECRET`, dan gaat de route niet door. Anders zou een vergeten variabele
 * de deur openzetten in plaats van hem dicht te houden.
 */
export async function requireCron(request: Request): Promise<CronContext> {
  const expected = process.env.CRON_SECRET;

  if (expected === undefined || expected === "") {
    return {
      ok: false,
      response: Response.json({ error: "CRON_SECRET ontbreekt. Zonder die variabele weigert deze route, want anders kan iedereen hem aanroepen." }, { status: 500 }),
    };
  }

  if (!sameSecret(request.headers.get("authorization") ?? "", `Bearer ${expected}`)) {
    /* Geen uitleg: wie hier zonder token aanklopt hoeft niet te weten of de route bestaat. */
    return { ok: false, response: new Response(null, { status: 404 }) };
  }

  const organisation = (await getDb().select({ id: organisations.id }).from(organisations).limit(1))[0];
  if (organisation === undefined) {
    return { ok: false, response: Response.json({ error: "Geen organisatie gevonden. Draai pnpm db:bootstrap." }, { status: 500 }) };
  }

  return { ok: true, organisationId: organisation.id };
}

/**
 * Twee geheimen vergelijken zonder te verraden hoeveel er gelijk was. Via een hash, zodat de twee
 * buffers altijd even lang zijn en `timingSafeEqual` ook bij een afwijkende lengte niet gooit.
 */
function sameSecret(given: string, expected: string): boolean {
  const a = createHash("sha256").update(given).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}
