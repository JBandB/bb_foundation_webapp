/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Bewijst de beloften van de kern tegen een echte database.
 *
 * Gebruik: pnpm check:core, op je dev-branch na pnpm db:seed.
 *
 * Wat hier staat, staat niet in een unittest omdat het in de database zit: een trigger, een unieke
 * index, een check constraint, een upsert. Alles in transacties die worden teruggedraaid.
 */

import { eq, sql } from "drizzle-orm";
import { auditLog, organisations, rateLimits, userPreferences, users } from "../lib/db/schema";
import { AuthorisationError } from "../lib/auth/can";
import { ADMIN_ROLES } from "../lib/auth/roles";
import { listStaff } from "../lib/auth/user-directory";
import { appendAuditLog, systemActor } from "../lib/db/audit";
import { CHECK_VIOLATION, RESTRICT_VIOLATION, UNIQUE_VIOLATION } from "../lib/db/errors";
import { createChecker, expectDbError, inRollback, requireContext } from "./lib/check";
import { scriptDb, withDirectDb } from "./lib/connection";
import { runScript } from "./lib/run";

runScript(async () => {
  await withDirectDb(async (pool) => {
    const db = scriptDb(pool);
    const ctx = await requireContext(db);
    const t = createChecker();

    t.section("1. De audit log is append-only");
    await inRollback(db, async (tx) => {
      await appendAuditLog(tx, systemActor(ctx.organisationId), { entityTable: "organisations", entityId: ctx.organisationId, action: "update", after: { check: true } });
      const row = (await tx.select({ id: auditLog.id }).from(auditLog).orderBy(sql`${auditLog.id} desc`).limit(1))[0];
      t.ok("een regel schrijven lukt", row !== undefined);
      if (row === undefined) return;

      const update = await expectDbError(tx, (sp) => sp.update(auditLog).set({ action: "gewijzigd" }).where(eq(auditLog.id, row.id)), { code: RESTRICT_VIOLATION });
      t.ok("een update wordt door de trigger geweigerd", update.matches, update.detail);

      const remove = await expectDbError(tx, (sp) => sp.delete(auditLog).where(eq(auditLog.id, row.id)), { code: RESTRICT_VIOLATION });
      t.ok("een delete ook", remove.matches, remove.detail);
    });

    t.section("2. Er is precies één organisatie");
    await inRollback(db, async (tx) => {
      const second = await expectDbError(tx, (sp) => sp.insert(organisations).values({ name: "Tweede organisatie" }), {
        code: UNIQUE_VIOLATION,
        constraint: "one_organisation",
      });
      t.ok("een tweede organisatie wordt geweigerd", second.matches, second.detail);
    });

    t.section("3. Een e-mailadres is uniek, ongeacht hoofdletters");
    await inRollback(db, async (tx) => {
      const duplicate = await expectDbError(
        tx,
        (sp) =>
          sp.insert(users).values({
            organisationId: ctx.organisationId,
            externalId: "check:duplicate",
            email: ctx.email.toUpperCase(),
            displayName: "Dubbel",
            initials: "DU",
          }),
        { code: UNIQUE_VIOLATION, constraint: "users_organisation_email_key" },
      );
      t.ok("hetzelfde adres in hoofdletters wordt geweigerd", duplicate.matches, duplicate.detail);
    });

    t.section("4. Een voorkeur kent alleen licht en donker");
    await inRollback(db, async (tx) => {
      const wrong = await expectDbError(
        tx,
        (sp) => sp.insert(userPreferences).values({ userId: ctx.userId, organisationId: ctx.organisationId, theme: "blauw" }),
        { code: CHECK_VIOLATION, constraint: "theme_known" },
      );
      t.ok("een onbekende modus wordt geweigerd", wrong.matches, wrong.detail);
    });

    t.section("5. De teller van rate_limits telt op");
    await inRollback(db, async (tx) => {
      const windowStart = new Date("2026-01-01T00:00:00Z");
      const bump = async (): Promise<number> =>
        (
          await tx
            .insert(rateLimits)
            .values({ organisationId: ctx.organisationId, key: "check:core", windowStart, count: 1 })
            .onConflictDoUpdate({ target: [rateLimits.key, rateLimits.windowStart], set: { count: sql`${rateLimits.count} + 1` } })
            .returning({ count: rateLimits.count })
        )[0]?.count ?? -1;
      t.check("de eerste poging telt één", await bump(), 1);
      t.check("de tweede telt twee", await bump(), 2);
    });

    t.section("6. Rechten zitten in de leesfunctie en niet alleen in het scherm");
    const base = { id: ctx.userId, organisationId: ctx.organisationId, name: "Check", email: ctx.email, initials: "CH" };
    const admin = ADMIN_ROLES[0];
    t.ok("er is een beheerdersrol in de configuratie", admin !== undefined);
    if (admin !== undefined) {
      const staff = await listStaff(db, { ...base, roles: [admin] });
      t.ok("een beheerder krijgt de gebruikerslijst", staff.length >= 1, `${staff.length} rijen`);
    }
    let refused = false;
    try {
      await listStaff(db, { ...base, roles: [] });
    } catch (error) {
      refused = error instanceof AuthorisationError;
    }
    t.ok("zonder rol wordt de gebruikerslijst geweigerd met een AuthorisationError", refused);

    t.summary("Kern");
  });
});
