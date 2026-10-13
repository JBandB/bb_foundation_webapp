/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Rijen opeisen voor één ronde. **Eén statement, en dat is de hele bescherming.** `for update skip
 * locked` laat een tweede ronde die tegelijk loopt de rijen van de eerste overslaan, en de lease in
 * `claimed_until` houdt ze daarna vast tot ze klaar of mislukt zijn. In een eerder project las een
 * ronde de wachtende rijen, voerde ze uit, en zette daarna pas de stand om: twee rondes tegelijk
 * (de cron en een knop op Beheer) maakten hetzelfde work item twee keer aan.
 *
 * Dit is de ene plek met die query. `claimJobs` is de variant voor de tabel jobs; de outbox van de
 * module messaging roept `claimRows` aan met zijn eigen tabel en kolommen. Elke tabel die meedoet
 * heeft `id`, `status`, `created_at`, `updated_at` en `claimed_until`.
 */
import { sql, type SQL } from "drizzle-orm";
import type { DbOrTransaction } from "@/lib/db/client";
import { rowsOf } from "@/lib/db/rows";
import { CLAIM_MINUTES } from "./constants";

export interface ClaimOptions {
  readonly table: string;
  /** De statussen die aan de beurt zijn, als tekst. */
  readonly statuses: readonly string[];
  /** De kolommen die terugkomen, naast `created_at` waarop wordt gesorteerd. */
  readonly columns: readonly string[];
  readonly limit: number;
  /** Een extra voorwaarde, zoals `and system = ...`. */
  readonly where?: SQL | undefined;
  readonly claimMinutes?: number;
}

/** Eist hoogstens `limit` rijen op en geeft ze terug in volgorde van aanmaken, als ruwe rijen. */
export async function claimRows<Row extends { created_at: string | Date }>(db: DbOrTransaction, options: ClaimOptions): Promise<Row[]> {
  if (options.limit <= 0) return [];
  const table = sql.identifier(options.table);
  const statuses = sql.join(
    options.statuses.map((status) => sql`${status}`),
    sql`, `,
  );
  const columns = sql.join(
    [...options.columns, "created_at"].map((column) => sql.identifier(column)),
    sql`, `,
  );

  const result = await db.execute(sql`
    update ${table} set claimed_until = now() + make_interval(mins => ${options.claimMinutes ?? CLAIM_MINUTES}), updated_at = now()
    where id in (
      select id from ${table}
      where status::text in (${statuses})
        and (claimed_until is null or claimed_until < now())
        ${options.where ?? sql``}
      order by created_at
      limit ${options.limit}
      for update skip locked
    )
    returning ${columns}
  `);

  return rowsOf<Row>(result).sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

export interface ClaimedJob {
  readonly id: string;
  readonly organisationId: string;
  readonly system: string;
  readonly operation: string;
  readonly entityType: string;
  readonly entityId: string;
  readonly attempts: number;
  readonly request: unknown;
}

interface JobRow {
  id: string;
  organisation_id: string;
  system: string;
  operation: string;
  entity_type: string;
  entity_id: string;
  attempts: number | string;
  request: unknown;
  created_at: string | Date;
}

export async function claimJobs(db: DbOrTransaction, limit: number, options: { readonly system?: string | undefined } = {}): Promise<ClaimedJob[]> {
  const rows = await claimRows<JobRow>(db, {
    table: "jobs",
    statuses: ["pending", "waiting"],
    columns: ["id", "organisation_id", "system", "operation", "entity_type", "entity_id", "attempts", "request"],
    limit,
    where: options.system === undefined ? undefined : sql`and system = ${options.system}`,
  });

  return rows.map((row) => ({
    id: row.id,
    organisationId: row.organisation_id,
    system: row.system,
    operation: row.operation,
    entityType: row.entity_type,
    entityId: row.entity_id,
    attempts: Number(row.attempts),
    request: row.request,
  }));
}
