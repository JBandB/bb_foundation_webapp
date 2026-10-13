/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { and, desc, eq } from "drizzle-orm";
import type { Actor } from "@/lib/auth/actor";
import { assertCan } from "@/lib/auth/can";
import type { DbOrTransaction } from "@/lib/db/client";
import { toolFeedback, users } from "@/lib/db/schema";

export interface FeedbackRow {
  readonly id: string;
  readonly title: string;
  readonly body: string;
  readonly pagePath: string;
  readonly createdAt: Date;
  readonly userName: string;
}

/** De laatste meldingen over de tool, voor Beheer, Feedback. Achter `admin:system`. */
export async function listFeedback(db: DbOrTransaction, actor: Actor, limit = 100): Promise<FeedbackRow[]> {
  assertCan(actor, "admin:system");

  return db
    .select({ id: toolFeedback.id, title: toolFeedback.title, body: toolFeedback.body, pagePath: toolFeedback.pagePath, createdAt: toolFeedback.createdAt, userName: users.displayName })
    .from(toolFeedback)
    .innerJoin(users, eq(users.id, toolFeedback.userId))
    .where(and(eq(toolFeedback.organisationId, actor.organisationId)))
    .orderBy(desc(toolFeedback.createdAt))
    .limit(limit);
}
