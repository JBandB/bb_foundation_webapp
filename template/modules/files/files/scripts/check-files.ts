/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm check:files`: de administratie van bestanden zonder opslag: een rij registreren, vinden,
 * zacht verwijderen, en de twee sloten (het recht uit de matrix en de controle van het project).
 * Alles in een transactie die wordt teruggedraaid.
 */
import type { Actor } from "../lib/auth/actor";
import { AuthorisationError } from "../lib/auth/can";
import { ADMIN_ROLES } from "../lib/auth/roles";
import { files } from "../lib/db/schema";
import { fileById, listFiles, removeFile } from "../lib/files/store";
import { createChecker, inRollback, requireContext } from "./lib/check";
import { scriptDb, withDirectDb } from "./lib/connection";
import { runScript } from "./lib/run";

runScript(async () => {
  await withDirectDb(async (pool) => {
    const db = scriptDb(pool);
    const ctx = await requireContext(db);
    const t = createChecker();
    const admin: Actor = { id: ctx.userId, organisationId: ctx.organisationId, name: "Check", email: ctx.email, initials: "CK", roles: [...ADMIN_ROLES] };
    const nobody: Actor = { ...admin, roles: [] };

    t.section("1. Registreren, vinden en zacht verwijderen");
    await inRollback(db, async (tx) => {
      const row = (
        await tx
          .insert(files)
          .values({ organisationId: ctx.organisationId, purpose: "documents", entityType: "check", entityId: "1", blobPath: `documents/check/1/${Date.now()}-check.pdf`, name: "check.pdf", contentType: "application/pdf", sizeBytes: 12, uploadedBy: ctx.userId })
          .returning({ id: files.id })
      )[0];
      if (row === undefined) throw new Error("geen rij");

      t.check("het bestand is te vinden op id", (await fileById(tx, admin, row.id))?.name, "check.pdf");
      t.check("en in de lijst van zijn entiteit", (await listFiles(tx, admin, { entityType: "check", entityId: "1" })).map((file) => file.id), [row.id]);
      t.check("verwijderen lukt", await removeFile(tx, admin, row.id), true);
      t.check("en daarna is het weg uit de lijst en niet meer te vinden", [(await listFiles(tx, admin, { entityType: "check", entityId: "1" })).length, await fileById(tx, admin, row.id)], [0, undefined]);
      t.check("nog een keer verwijderen is niets", await removeFile(tx, admin, row.id), false);
    });

    t.section("2. Zonder recht bestaat er niets");
    await inRollback(db, async (tx) => {
      const refused = await fileById(tx, nobody, "00000000-0000-0000-0000-000000000000").then(
        () => false,
        (error: unknown) => error instanceof AuthorisationError,
      );
      t.ok("lezen zonder files:read wordt geweigerd", refused);
      const refusedWrite = await removeFile(tx, nobody, "00000000-0000-0000-0000-000000000000").then(
        () => false,
        (error: unknown) => error instanceof AuthorisationError,
      );
      t.ok("verwijderen zonder files:write ook", refusedWrite);
    });

    t.summary("check:files");
  });
});
