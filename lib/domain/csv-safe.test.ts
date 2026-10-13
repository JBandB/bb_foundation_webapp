/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { CSV_BOM, csvDocument, csvField, csvLine, guessSeparator, neutraliseFormula, stripNeutralisation } from "./csv-safe";

describe("csvDocument", () => {
  it("begint met een BOM, scheidt met puntkomma en eindigt elke regel met CRLF", () => {
    const text = csvDocument([
      ["naam", "aantal"],
      ["Zoë", 3],
    ]);
    expect(text.startsWith(CSV_BOM)).toBe(true);
    expect(text.slice(1)).toBe('"naam";"aantal"\r\n"Zoë";"3"\r\n');
  });

  it("verdubbelt aanhalingstekens en laat een regelovergang in een veld staan", () => {
    expect(csvField('zei "ja"')).toBe('"zei ""ja"""');
    expect(csvLine(["a\nb", null, undefined, true, 10n])).toBe('"a\nb";"";"";"true";"10"');
  });
});

describe("formules neutraliseren", () => {
  it("zet een apostrof voor wat Excel zou uitvoeren, maar niet voor een gewoon getal", () => {
    expect(neutraliseFormula("=SUM(A1:A9)")).toBe("'=SUM(A1:A9)");
    expect(neutraliseFormula("+31 6 1234")).toBe("'+31 6 1234");
    expect(neutraliseFormula("@naam")).toBe("'@naam");
    expect(neutraliseFormula("-tekst")).toBe("'-tekst");
    expect(neutraliseFormula("-12,50")).toBe("-12,50");
    expect(neutraliseFormula("12.5")).toBe("12.5");
    expect(neutraliseFormula("gewoon")).toBe("gewoon");
    expect(csvField("=1+1")).toBe("\"'=1+1\"");
  });

  it("is omkeerbaar bij het opnieuw inlezen, zonder een gewone apostrof te raken", () => {
    for (const value of ["=SUM(A1)", "+31", "@x", "-tekst", "-12,50", "gewoon", "'s-Hertogenbosch"]) {
      expect(stripNeutralisation(neutraliseFormula(value))).toBe(value);
    }
    expect(stripNeutralisation("'")).toBe("'");
  });
});

describe("guessSeparator", () => {
  it("kiest het vaakst voorkomende teken buiten aanhalingstekens, en puntkomma als er niets is", () => {
    expect(guessSeparator("a;b;c")).toBe(";");
    expect(guessSeparator("a,b,c")).toBe(",");
    expect(guessSeparator('"x;y;z",b,c')).toBe(",");
    expect(guessSeparator("a\tb\tc")).toBe("\t");
    expect(guessSeparator("alleen")).toBe(";");
  });
});
