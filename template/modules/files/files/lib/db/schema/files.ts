/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Bestanden in Azure Blob Storage, met hier alleen de administratie: wat het is, waar het bij hoort,
 * waar het staat en wie het bracht. De inhoud staat in de container; de app praat er alleen mee via
 * lib/files/blob.ts, met een SAS-token dat nooit de browser bereikt.
 *
 * **`purpose`** is het doel uit lib/files/purposes.ts (van het project): bepaalt de toegestane
 * types en de grens. **`entity_type` en `entity_id`** zeggen waar het bestand bij hoort; geen
 * foreign key, want dat wisselt per project. **Verwijderen is zacht**: een bestand kan onder een
 * bewaarplicht vallen, en de blob blijft staan tot een mens of een opruimtaak hem weghaalt.
 */
import { index, integer, pgTable, text, unique, uuid } from "drizzle-orm/pg-core";
import { primaryKeyColumn, softDelete, timestamps } from "./columns";
import { organisations } from "./organisations";
import { users } from "./users";

export const files = pgTable(
  "files",
  {
    id: primaryKeyColumn(),
    organisationId: uuid("organisation_id")
      .notNull()
      .references(() => organisations.id),
    purpose: text("purpose").notNull(),
    entityType: text("entity_type").notNull(),
    entityId: text("entity_id").notNull(),
    /** Het pad in de container: `<doel>/<entity_type>/<entity_id>/<tijdstip>-<naam>`. */
    blobPath: text("blob_path").notNull(),
    name: text("name").notNull(),
    contentType: text("content_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    uploadedBy: uuid("uploaded_by").references(() => users.id),
    ...timestamps,
    ...softDelete,
  },
  (t) => [unique("files_blob_path").on(t.blobPath), index("files_entity_idx").on(t.entityType, t.entityId, t.deletedAt)],
);

export type FileRow = typeof files.$inferSelect;
