/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Regel: geen echte waarde in .env.example, want dat bestand staat in git.
 *
 * Deze regel bestaat omdat het in een eerder project bijna is misgegaan: de echte databasestring,
 * het AUTH_SECRET en een client secret stonden in dat bestand ingevuld, en het was één `git add -A`
 * van GitHub af. Een placeholder herken je hier aan punthaken, en een waarde van acht tekens of
 * korter kan geen geheim zijn.
 *
 * Dit is een regel over de repo en niet over een bestand uit de wandeling. Die wandeling filtert
 * namelijk op extensie, en `.env.example` eindigt op `.example`. Bij de eerste versie viel de
 * controle daardoor stil zonder iets te melden, en een controle die stil uitvalt is erger dan geen
 * controle.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

const FILE = ".env.example";

/** Waarden tot en met deze lengte zijn te kort om een geheim te zijn. */
const HARMLESS_LENGTH = 8;

export function checkEnvTemplate(root, report) {
  let text;
  try {
    text = readFileSync(join(root, FILE), "utf8");
  } catch {
    report(`${FILE} ontbreekt, en dat is het bestand waar nieuwe ontwikkelaars mee beginnen`);
    return;
  }

  text.split("\n").forEach((line, index) => {
    const trimmed = line.trim();
    if (trimmed === "" || trimmed.startsWith("#")) return;

    const separator = trimmed.indexOf("=");
    if (separator === -1) return;

    const key = trimmed.slice(0, separator);
    const value = trimmed.slice(separator + 1);

    if (value === "") return;
    if (value.includes("<") && value.includes(">")) return;
    if (value.length <= HARMLESS_LENGTH) return;

    report(
      `${FILE}:${index + 1} ${key} heeft een waarde die geen placeholder is. Zet de echte waarde in .env.local en gebruik hier <punthaken>`,
    );
  });
}
