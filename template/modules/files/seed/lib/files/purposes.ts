import type { PurposeSpec } from "./blob";

/**
 * De doelen waarvoor dit project bestanden bewaart, met per doel de grens en de toegestane types.
 * Een doel is een map in de container en een woord in `files.purpose`. Eén container en één token
 * voor alles, tenzij een doel zijn eigen `containerVar` en `tokenVar` noemt (bijvoorbeeld voor
 * bestanden van buitenstaanders, zodat hun token de rest niet kan openen).
 *
 * Dit bestand is van het project en blijft staan bij een update van het template. Vier megabyte is
 * de grens die een server action op Vercel aankan; groter vraagt een andere weg (rechtstreeks naar de
 * opslag met een kortlevend token), en die hoort bij het project dat het nodig heeft.
 */
export const FILE_PURPOSES: Readonly<Record<string, PurposeSpec>> = {
  documents: {
    maxBytes: 4 * 1024 * 1024,
    types: new Map([
      ["application/pdf", "pdf"],
      ["application/vnd.openxmlformats-officedocument.wordprocessingml.document", "docx"],
      ["image/png", "png"],
      ["image/jpeg", "jpg"],
    ]),
  },
};
