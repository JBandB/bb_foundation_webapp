/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { PROJECT } from "../project/config.generated";
import { dateIn, formatDate, isIsoDate } from "./dates";

describe("datums", () => {
  it("herkent een echte datum", () => {
    expect(isIsoDate("2026-10-02")).toBe(true);
    expect(isIsoDate("2026-02-30")).toBe(false);
    expect(isIsoDate("gisteren")).toBe(false);
    expect(isIsoDate("2026-1-2")).toBe(false);
  });

  it("leidt de datum af in een tijdzone en niet via de serverklok", () => {
    expect(dateIn(new Date("2026-10-02T23:30:00Z"), "Europe/Amsterdam")).toBe("2026-10-03");
    expect(dateIn(new Date("2026-10-02T23:30:00Z"), "UTC")).toBe("2026-10-02");
  });

  it("schrijft een datum in de locale van het project", () => {
    /* De locale komt uit project.config.json; dit bestand reist mee naar projecten in beide talen. */
    expect(formatDate("2026-10-02")).toBe(PROJECT.locale === "en-GB" ? "2 October 2026" : "2 oktober 2026");
    expect(formatDate("niet")).toBe("niet");
  });
});
