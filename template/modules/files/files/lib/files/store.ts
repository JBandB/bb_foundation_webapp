/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Bestanden brengen, vinden en (zacht) verwijderen. Twee sloten op elke handeling: het recht uit
 * de matrix (`files:read`, `files:write`) en de rij-niveau-controle van het project in
 * lib/files/authorize.project.ts. Een bestand dat iemand niet mag zien, bestaat voor hem niet (404).
 */
import { and, desc, eq, isNull, sql } from "drizzle-orm";
import type { Actor } from "@/lib/auth/actor";
import { assertCan, AuthorisationError } from "@/lib/auth/can";
import { appendAuditLog } from "@/lib/db/audit";
import type { DbOrTransaction } from "@/lib/db/client";
import { files } from "@/lib/db/schema";
import { canReadFile, canWriteFile } from "./authorize.project";
import { uploadBlob, type UploadProblem } from "./blob";

export interface FileScope {
  readonly purpose: string;
  readonly entityType: string;
  readonly entityId: string;
}

export interface FileSummary extends FileScope {
  readonly id: string;
  readonly organisationId: string;
  readonly name: string;
  readonly contentType: string;
  readonly sizeBytes: number;
  readonly blobPath: string;
  readonly uploadedBy: string | null;
  readonly createdAt: Date;
}

const SUMMARY = {
  id: files.id,
  organisationId: files.organisationId,
  purpose: files.purpose,
  entityType: files.entityType,
  entityId: files.entityId,
  name: files.name,
  contentType: files.contentType,
  sizeBytes: files.sizeBytes,
  blobPath: files.blobPath,
  uploadedBy: files.uploadedBy,
  createdAt: files.createdAt,
} as const;

export type StoreResult = { readonly ok: true; readonly file: FileSummary } | { readonly ok: false; readonly problem: UploadProblem; readonly detail?: string | undefined };

export async function uploadFile(db: DbOrTransaction, actor: Actor, scope: FileScope, file: File): Promise<StoreResult> {
  assertCan(actor, "files:write");
  if (!(await canWriteFile(actor, scope))) throw new AuthorisationError("files:write");

  const uploaded = await uploadBlob({ ...scope, file });
  if (!uploaded.ok) return { ok: false, problem: uploaded.problem, detail: uploaded.detail };

  const row = (
    await db
      .insert(files)
      .values({
        organisationId: actor.organisationId,
        purpose: scope.purpose,
        entityType: scope.entityType,
        entityId: scope.entityId,
        blobPath: uploaded.blobPath,
        name: file.name.slice(0, 200),
        contentType: uploaded.contentType,
        sizeBytes: uploaded.sizeBytes,
        uploadedBy: actor.id,
      })
      .returning(SUMMARY)
  )[0];
  if (row === undefined) throw new Error("Het bestand is opgeslagen maar niet geregistreerd.");
  await appendAuditLog(db, actor, { entityTable: "files", entityId: row.id, action: "insert", after: { purpose: scope.purpose, entityType: scope.entityType, entityId: scope.entityId, name: row.name, sizeBytes: row.sizeBytes } });
  return { ok: true, file: row };
}

/** Eén bestand, als het bestaat, niet verwijderd is en deze persoon het mag zien. */
export async function fileById(db: DbOrTransaction, actor: Actor, id: string): Promise<FileSummary | undefined> {
  assertCan(actor, "files:read");
  const row = (await db.select(SUMMARY).from(files).where(and(eq(files.id, id), eq(files.organisationId, actor.organisationId), isNull(files.deletedAt))).limit(1))[0];
  if (row === undefined || !(await canReadFile(actor, row))) return undefined;
  return row;
}

/** De bestanden bij één entiteit, nieuwste eerst, alleen wat deze persoon mag zien. */
export async function listFiles(db: DbOrTransaction, actor: Actor, scope: Omit<FileScope, "purpose"> & { readonly purpose?: string }): Promise<FileSummary[]> {
  assertCan(actor, "files:read");
  const conditions = [eq(files.organisationId, actor.organisationId), eq(files.entityType, scope.entityType), eq(files.entityId, scope.entityId), isNull(files.deletedAt)];
  if (scope.purpose !== undefined) conditions.push(eq(files.purpose, scope.purpose));
  const rows = await db
    .select(SUMMARY)
    .from(files)
    .where(and(...conditions))
    .orderBy(desc(files.createdAt));
  const allowed: FileSummary[] = [];
  for (const row of rows) if (await canReadFile(actor, row)) allowed.push(row);
  return allowed;
}

/** Zacht verwijderen: de rij blijft, de blob blijft, en het bestand is weg uit elke lijst. */
export async function removeFile(db: DbOrTransaction, actor: Actor, id: string): Promise<boolean> {
  assertCan(actor, "files:write");
  const row = await fileById(db, actor, id);
  if (row === undefined || !(await canWriteFile(actor, row))) return false;
  await db.update(files).set({ deletedAt: sql`now()`, updatedAt: sql`now()` }).where(eq(files.id, id));
  await appendAuditLog(db, actor, { entityTable: "files", entityId: id, action: "delete", before: { name: row.name, blobPath: row.blobPath } });
  return true;
}

export function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}
