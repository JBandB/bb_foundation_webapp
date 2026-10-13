/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { parseRich, parseSpans } from "./rich-text";

describe("rich-text", () => {
  it("leest vet en cursief, en laat een los sterretje staan", () => {
    expect(parseSpans("a **b** *c* d*")).toEqual([{ text: "a " }, { text: "b", bold: true }, { text: " " }, { text: "c", italic: true }, { text: " d*" }]);
    expect(parseSpans("****")).toEqual([{ text: "****" }]);
  });

  it("maakt alinea's en lijsten, met regels binnen een alinea bewaard", () => {
    const blocks = parseRich("regel een\nregel twee\n\n- a\n- b\n1. c");
    expect(blocks).toEqual([
      { kind: "paragraph", spans: [{ text: "regel een\nregel twee" }] },
      { kind: "list", ordered: false, items: [[{ text: "a" }], [{ text: "b" }]] },
      { kind: "list", ordered: true, items: [[{ text: "c" }]] },
    ]);
    expect(parseRich("")).toEqual([]);
  });
});
