/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: geen geheim als letterlijke waarde in een bestand, ook niet de soorten die secretlint mist.
 *
 * **Waarom naast secretlint.** `pnpm check:secrets` draait de aanbevolen regelset van secretlint, en
 * die kent een paar geheimen niet waar deze stack op draait: de handtekening van een Azure-SAS, een
 * clientsecret van Entra, de webhook van Teams of Power Automate, een ingevulde PAT, een
 * accountsleutel van de opslag. In een eerder project ging een debugscript met een ingevulde PAT of
 * SAS zo door de scan en door de CI heen, en staat het daarna voorgoed in de historie. Deze regel
 * vangt het op het moment dat je het schrijft, want de huisregels lopen mee op `pnpm lint`.
 *
 * **Wat niet:** `.env*` (daar horen de echte waarden juist) en lockfiles (integriteitshashes lijken op
 * alles). Een waarde die aantoonbaar geen geheim is, krijgt dezelfde markering als bij secretlint:
 * `secretlint-disable-next-line` op de regel erboven. Eén uitzondering voor beide scans, op één plek
 * te zien in de review.
 *
 * De melding noemt het bestand, de regel en de soort, en nooit de gevonden waarde: die zou anders in
 * de CI-log staan.
 */

import { lineAt } from "./files.mjs";

const SKIPPED_NAMES = new Set(["pnpm-lock.yaml", "package-lock.json", "yarn.lock"]);
const DISABLE_NEXT_LINE = "secretlint-disable-next-line";

/**
 * Elk patroon met een lengte erbij: een document dat zegt dat een SAS `sig=` draagt, is geen
 * geheim, een handtekening van twintig tekens wel.
 */
const PATTERNS = [
  { name: "een handtekening van een Azure SAS-token (sig=)", pattern: /\bsig=[A-Za-z0-9%+/=]{20,}/g },
  /* Een clientsecret van Entra: drie tekens, een cijfer, `Q~`, en de rest van de veertig. */
  { name: "een clientsecret van Entra", pattern: /[A-Za-z0-9_~.-]{3}\dQ~[A-Za-z0-9_~.-]{31,34}/g },
  /* Teams en Power Automate: het pad is het geheim, dus een host met een lang pad erachter. */
  {
    name: "een webhook van Teams of Power Automate",
    pattern: /(?:logic\.azure\.com|webhook\.office\.com|environment\.api\.powerplatform\.com)(?::\d+)?\/[A-Za-z0-9/_@.%?=&:+-]{30,}/g,
  },
  { name: "een ingevulde PAT", pattern: /\b(?:[A-Z][A-Z0-9_]*_)?PAT["']?\s*[:=]\s*["'`]?[A-Za-z0-9]{40,}/g },
  { name: "een accountsleutel van Azure Storage (AccountKey=)", pattern: /\bAccountKey=[A-Za-z0-9+/]{20,}/g },
  { name: "een private key", pattern: /-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY-----/g },
];

function isSkipped(rel) {
  const name = rel.slice(rel.lastIndexOf("/") + 1);
  return name.startsWith(".env") || SKIPPED_NAMES.has(name);
}

export function checkSecretPatterns(rel, text, report) {
  if (isSkipped(rel)) return;

  const lines = text.split("\n");
  for (const { name, pattern } of PATTERNS) {
    pattern.lastIndex = 0;
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const line = lineAt(text, match.index);
      if ((lines[line - 2] ?? "").includes(DISABLE_NEXT_LINE)) continue;
      report(`${rel}:${line} lijkt ${name} te bevatten. Een geheim hoort in .env.local of in Vercel, nooit in een bestand dat in git kan komen.`);
    }
  }
}
