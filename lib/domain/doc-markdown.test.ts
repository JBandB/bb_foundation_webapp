/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { decisionStand } from "@/lib/docs/read-doc";
import { parseDoc, parseDocSpans, sectionOf } from "./doc-markdown";

describe("doc-markdown", () => {
  it("leest koppen, alinea's, lijsten, code en tabellen", () => {
    const blocks = parseDoc(["# Titel", "", "Een alinea met `code` en **vet**.", "", "- een", "- twee", "", "```", "x = 1", "```", "", "| A | B |", "|---|---|", "| 1 | 2 |"].join("\n"));
    expect(blocks.map((block) => block.kind)).toEqual(["heading", "paragraph", "list", "code", "table"]);
    expect(parseDocSpans("a `b` **c**")).toEqual([{ text: "a " }, { text: "b", code: true }, { text: " " }, { text: "c", bold: true }]);
  });

  it("laat een punt doorlopen op een ingesprongen regel, en sluit de lijst op een regel zonder inspringing", () => {
    const blocks = parseDoc(["- een punt dat", "  doorloopt met **vet**", "- twee", "", "Een alinea.", "1. drie", "   loopt ook door"].join("\n"));
    expect(blocks.map((block) => block.kind)).toEqual(["list", "paragraph", "list"]);
    const first = blocks[0];
    if (first?.kind === "list") {
      expect(first.items).toHaveLength(2);
      expect(first.items[0]?.map((span) => span.text).join("")).toBe("een punt dat doorloopt met vet");
      expect(first.items[0]?.some((span) => span.bold === true)).toBe(true);
    }
    const third = blocks[2];
    if (third?.kind === "list") expect(third.items[0]?.map((span) => span.text).join("")).toBe("drie loopt ook door");
  });

  it("laat een tabel doorlopen over een lege regel, en slaat een HTML-commentaar over", () => {
    const blocks = parseDoc(["<!-- kop -->", "| # | Besluit | Waarom |", "|---|---|---|", "| D1 | Een | Omdat |", "", "| D2 | Twee | Daarom |"].join("\n"));
    expect(blocks).toHaveLength(1);
    const table = blocks[0];
    expect(table?.kind).toBe("table");
    if (table?.kind === "table") expect(table.rows).toHaveLength(2);
    expect(decisionStand(blocks)).toEqual({ count: 2, highest: 2 });
  });

  it("snijdt een hoofdstuk op zijn kop", () => {
    const text = ["# Spec", "## 2. Niet", "x", "## 3. Besluitenlog", "### 3.1 Lopend", "| # |", "## 4. Volgende", "y"].join("\n");
    expect(sectionOf(text, "## 3. Besluitenlog")).toBe(["## 3. Besluitenlog", "### 3.1 Lopend", "| # |"].join("\n"));
    expect(sectionOf(text, "## 9. Bestaat niet")).toBe("");
  });
});
