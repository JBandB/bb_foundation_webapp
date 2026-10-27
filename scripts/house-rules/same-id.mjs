/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: een id wordt niet met `===` of `!==` tegen `actor.id` gehouden, maar met `sameId` uit
 * `lib/domain/ids.ts`.
 *
 * **Waarom.** Postgres vergelijkt een `uuid` zonder op hoofdletters te letten, JavaScript een string
 * wel. Een id uit een formulier of een URL gaat ongewijzigd naar de query, dus `B57CBC18-...` is daar
 * dezelfde rij als `b57cbc18-...`, terwijl `userId === actor.id` "iemand anders" zegt. In een eerder
 * project kon zo iemand een "nooit jezelf"-slot omzeilen met het eigen id in hoofdletters.
 *
 * **Wat de regel ziet:** elke `===` of `!==` met `actor.id` aan één kant en geen tekstletterlijke
 * waarde aan de andere (`actor.id === ""` mag). Ook een id uit de database telt mee: dat staat al in
 * kleine letters, maar `sameId` kost daar niets en houdt de regel eenvoudig.
 */

import { lineAt } from "./files.mjs";

const OPERAND = String.raw`(?<![\w$."'\x60])[\w$][\w$.?]*`;
const PATTERN = new RegExp(String.raw`${OPERAND}\s*[!=]==\s*actor\.id\b|\bactor\.id\s*[!=]==\s*(?!["'\x60])[\w$]`, "g");

export function checkSameId(rel, text, report) {
  if (!rel.endsWith(".ts") && !rel.endsWith(".tsx")) return;
  if (!/^(app|components|lib)\//.test(rel)) return;
  if (rel.endsWith(".test.ts")) return;
  if (!text.includes("actor.id")) return;

  for (const match of text.matchAll(PATTERN)) {
    report(
      `${rel}:${lineAt(text, match.index ?? 0)} ${match[0].trim()}: vergelijk een id met sameId() uit lib/domain/ids.ts. Postgres let niet op hoofdletters, === wel.`,
    );
  }
}
