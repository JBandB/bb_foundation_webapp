/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: in een `sql`-fragment met een subquery staat een kolom van de buitenste tabel uitgeschreven,
 * met de tabelnaam ervoor (`orders.customer_id`), en niet als `${orders.customerId}`.
 *
 * **Waarom.** Drizzle zet de tabelnaam alleen voor een kolom als de buitenste query een join heeft.
 * Zonder join wordt `${orders.customerId}` gewoon `"customer_id"`, en in een subquery leest Postgres
 * dat als de kolom van de dichtstbijzijnde tabel die zo'n kolom heeft: die van de subquery zelf.
 * `c.customer_id = "customer_id"` is dan altijd waar. In een eerder project waardeerde een prognose
 * daardoor uren tegen een willekeurig tarief, en op zes andere plekken telde of zocht een subquery
 * tegen zijn eigen rijen. Met een join ging het wel goed, en daarom viel het niet op: dezelfde regel
 * code is goed of fout afhankelijk van een join een paar regels verder. Zie docs/lessen.
 *
 * **Wat de regel ziet:** een `sql`-template met `select` of `exists (` erin, en daarin een
 * `${x.y}` waarbij `x` een tabel of view uit `lib/db/schema` is. Een waarde (`${filter.userId}`)
 * of een tabel zonder kolom (`${orders}`) is prima. Buiten een subquery is `${x.y}` ook prima, want
 * daar is er maar één tabel om naar te wijzen.
 */

import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { lineAt } from "./files.mjs";

let tableNames;

/** De namen van de tabel- en viewobjecten uit het schema, één keer ingelezen. */
function schemaTables() {
  if (tableNames !== undefined) return tableNames;
  tableNames = new Set();
  const dir = join(process.cwd(), "lib", "db", "schema");
  if (!existsSync(dir)) return tableNames;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith(".ts")) continue;
    const text = readFileSync(join(dir, name), "utf8");
    for (const match of text.matchAll(/export const (\w+) = pg(?:Table|View)\(/g)) {
      tableNames.add(match[1]);
    }
  }
  return tableNames;
}

export function checkSubqueryColumns(rel, text, report) {
  if (!rel.endsWith(".ts") && !rel.endsWith(".tsx")) return;
  if (rel.startsWith("scripts/house-rules/")) return;
  if (!text.includes("sql")) return;

  const tables = schemaTables();
  if (tables.size === 0) return;
  for (const template of text.matchAll(/sql(?:<[^`]*?>)?`([\s\S]*?)`/g)) {
    const body = template[1] ?? "";
    if (!/\bselect\b|\bexists\s*\(/i.test(body)) continue;
    for (const ref of body.matchAll(/\$\{(\w+)\.(\w+)\}/g)) {
      if (!tables.has(ref[1])) continue;
      const at = (template.index ?? 0) + 4 + (ref.index ?? 0);
      report(
        `${rel}:${lineAt(text, at)} \${${ref[1]}.${ref[2]}} in een subquery: schrijf de kolom uit met de tabelnaam ervoor. Zonder join laat Drizzle de tabelnaam weg, en dan wijst hij naar de tabel van de subquery.`,
      );
    }
  }
}
