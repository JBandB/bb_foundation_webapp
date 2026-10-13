/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm check:messaging`: de sloten van mail en meldingen, tegen de dev-branch, alles teruggedraaid.
 * De catalogus is consistent, de outbox is idempotent en gebruikt de lease, pogingen tellen, de
 * instellingen vallen terug op de standaard en weigeren een verkeerde doelgroep, en een soort die
 * uit staat verstuurt niets.
 */
import { and, eq, sql } from "drizzle-orm";
import type { Actor } from "../lib/auth/actor";
import { ADMIN_ROLES } from "../lib/auth/roles";
import { auditLog, outbox } from "../lib/db/schema";
import { labels } from "../lib/i18n/labels";
import { enqueueKind } from "../lib/messaging/enqueue-kind";
import { catalogueProblems, kindFor, MESSAGE_KINDS } from "../lib/messaging/kinds";
import { claimPending, enqueueMessages, markFailed, MAX_MAIL_ATTEMPTS, pruneOutbox } from "../lib/messaging/outbox";
import { audienceEmails } from "../lib/messaging/recipients";
import { loadSettings, mergeSettings, saveSetting, settingFor } from "../lib/messaging/settings";
import { createChecker, inRollback, requireContext } from "./lib/check";
import { scriptDb, withDirectDb } from "./lib/connection";
import { runScript } from "./lib/run";

runScript(async () => {
  await withDirectDb(async (pool) => {
    const db = scriptDb(pool);
    const ctx = await requireContext(db);
    const t = createChecker();
    const actor: Actor = { id: ctx.userId, organisationId: ctx.organisationId, name: "Check", email: ctx.email, initials: "CK", roles: [...ADMIN_ROLES] };
    const stuck = kindFor("integration_stuck");

    t.section("1. De catalogus is consistent");
    t.check("geen problemen in de catalogus", catalogueProblems(), []);
    t.ok("de kern brengt haar soorten mee", MESSAGE_KINDS.some((kind) => kind.key === "login_help"));

    t.section("2. De outbox is idempotent en gebruikt de lease");
    await inRollback(db, async (tx) => {
      const message = { idempotencyKey: "check:outbox:1", kind: "integration_stuck", toEmail: ctx.email, subject: "Check", bodyMd: "tekst" };
      const first = await enqueueMessages(tx, ctx.organisationId, [message]);
      const second = await enqueueMessages(tx, ctx.organisationId, [message]);
      t.check("één keer nieuw, daarna niets", [first, second], [1, 0]);

      const claimed = await claimPending(tx, ctx.organisationId, ["mail"], 10);
      const again = await claimPending(tx, ctx.organisationId, ["mail"], 10);
      t.check("de eerste ronde eist hem op, de tweede krijgt niets", [claimed.length, again.length], [1, 0]);
      t.check("een kanaal dat uit staat krijgt niets", (await claimPending(tx, ctx.organisationId, [], 10)).length, 0);
    });

    t.section("3. Pogingen tellen, en na de laatste blijft een bericht op mislukt staan");
    await inRollback(db, async (tx) => {
      await enqueueMessages(tx, ctx.organisationId, [{ idempotencyKey: "check:fail:1", kind: "integration_stuck", toEmail: ctx.email, subject: "Check", bodyMd: "tekst" }]);
      const row = (await tx.select({ id: outbox.id }).from(outbox).where(eq(outbox.idempotencyKey, "check:fail:1")))[0];
      if (row === undefined) throw new Error("het bericht is niet ingezet");
      let outcome: "retry" | "failed" = "retry";
      for (let attempt = 0; attempt < MAX_MAIL_ATTEMPTS; attempt += 1) outcome = await markFailed(tx, row.id, attempt, `poging ${attempt + 1}`);
      const after = (await tx.select({ status: outbox.status, attempts: outbox.attempts, lastError: outbox.lastError }).from(outbox).where(eq(outbox.id, row.id)))[0];
      t.check("definitief mislukt met de laatste fout erop", [outcome, after?.status, Number(after?.attempts), after?.lastError], ["failed", "failed", MAX_MAIL_ATTEMPTS, `poging ${MAX_MAIL_ATTEMPTS}`]);
    });

    t.section("4. Instellingen: standaard uit de catalogus, een verkeerde doelgroep geweigerd, een goede bewaard met auditregel");
    await inRollback(db, async (tx) => {
      const defaults = mergeSettings([]);
      t.check("zonder rijen geldt de standaard", settingFor(defaults, "integration_stuck"), { kind: "integration_stuck", enabled: true, audience: stuck.defaultAudience, threshold: stuck.threshold?.fallback, isDefault: true });

      const refused = await saveSetting(tx, actor, { kind: "integration_stuck", enabled: true, audience: "person", threshold: "1" }, labels.messaging.settingErrors);
      t.ok("een doelgroep die niet bij de soort hoort wordt geweigerd", !refused.ok && refused.errors.audience !== undefined);

      const bad = await saveSetting(tx, actor, { kind: "integration_stuck", enabled: true, audience: "admins", threshold: "1,1" }, labels.messaging.settingErrors);
      t.ok("een drempel die geen kwartier is wordt geweigerd", !bad.ok && bad.errors.threshold === labels.messaging.settingErrors.threshold.quarters);

      const saved = await saveSetting(tx, actor, { kind: "integration_stuck", enabled: false, audience: "admins", threshold: "2" }, labels.messaging.settingErrors);
      const loaded = settingFor(await loadSettings(tx, ctx.organisationId), "integration_stuck");
      t.check("een goede instelling wordt bewaard, met uren als minuten", [saved.ok, loaded.enabled, loaded.threshold, loaded.isDefault], [true, false, 120, false]);
      const audit = await tx
        .select({ n: sql<number>`count(*)::int` })
        .from(auditLog)
        .where(and(eq(auditLog.entityTable, "notification_settings"), eq(auditLog.entityId, ctx.organisationId)));
      t.ok("er staat een auditregel", Number(audit[0]?.n ?? 0) >= 1);

      const silent = await enqueueKind(tx, ctx.organisationId, "integration_stuck", { about: "check", subject: "Check", bodyMd: "tekst" });
      t.check("een soort die uit staat verstuurt niets", silent, { enabled: false, recipients: 0, queued: 0 });
    });

    t.section("5. Ontvangers volgen de doelgroep");
    await inRollback(db, async (tx) => {
      const admins = await audienceEmails(tx, ctx.organisationId, "admins");
      t.ok("de doelgroep beheerders levert een lijst zonder dubbelen", new Set(admins).size === admins.length);
      t.check("een persoon is precies dat adres", await audienceEmails(tx, ctx.organisationId, "person", "iemand@voorbeeld.invalid"), ["iemand@voorbeeld.invalid"]);
      t.check("een persoon zonder adres is niemand", await audienceEmails(tx, ctx.organisationId, "person"), []);
    });

    t.section("6. Verstuurde berichten van langer geleden gaan weg");
    await inRollback(db, async (tx) => {
      await enqueueMessages(tx, ctx.organisationId, [
        { idempotencyKey: "check:old:1", kind: "integration_stuck", toEmail: ctx.email, subject: "Oud", bodyMd: "tekst" },
        { idempotencyKey: "check:new:1", kind: "integration_stuck", toEmail: ctx.email, subject: "Nieuw", bodyMd: "tekst" },
      ]);
      const longAgo = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000);
      await tx.update(outbox).set({ status: "sent", sentAt: longAgo }).where(eq(outbox.idempotencyKey, "check:old:1"));
      await tx.update(outbox).set({ status: "sent", sentAt: new Date() }).where(eq(outbox.idempotencyKey, "check:new:1"));
      const removed = await pruneOutbox(tx);
      t.check("één weg", removed, 1);
    });

    t.summary("check:messaging");
  });
});
