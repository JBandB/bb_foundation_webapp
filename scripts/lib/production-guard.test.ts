/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { productionTargetMessage, productionTargetVerdict, productionVerdict } from "./production-guard";

const PRODUCTION = "ep-orange-rain-a23iw8ef";
const DEV = "ep-frosty-art-a2xtdozx";

describe("productionVerdict", () => {
  it("weigert het endpoint van productie", () => {
    expect(productionVerdict(PRODUCTION, PRODUCTION)).toBe("production");
  });

  it("weigert als niet bekend is welk endpoint productie is (fail closed)", () => {
    expect(productionVerdict(DEV, undefined)).toBe("unknown");
    expect(productionVerdict(DEV, "")).toBe("unknown");
    expect(productionVerdict(DEV, "   ")).toBe("unknown");
  });

  it("laat een ander endpoint door", () => {
    expect(productionVerdict(DEV, PRODUCTION)).toBe("allowed");
  });

  /* Een spatie of regeleinde achter een geplakte waarde mag de guard niet openzetten. */
  it("negeert witruimte rond de ingestelde waarde", () => {
    expect(productionVerdict(PRODUCTION, ` ${PRODUCTION}\n`)).toBe("production");
  });
});

describe("productionTargetVerdict", () => {
  it("laat een productiedeploy op het endpoint van productie migreren", () => {
    expect(productionTargetVerdict(PRODUCTION, PRODUCTION)).toBe("allowed");
  });

  it("weigert een productiedeploy die naar een andere branch wijst", () => {
    expect(productionTargetVerdict(DEV, ` ${PRODUCTION} `)).toBe("elsewhere");
  });

  it("migreert als niet bekend is welk endpoint productie is, zoals voorheen", () => {
    expect(productionTargetVerdict(DEV, undefined)).toBe("allowed");
    expect(productionTargetVerdict(DEV, "  ")).toBe("allowed");
  });

  it("noemt beide endpoints en waar je kijkt, zonder iets anders uit de verbinding", () => {
    const message = productionTargetMessage(DEV, PRODUCTION);
    expect(message).toContain(DEV);
    expect(message).toContain(PRODUCTION);
    expect(message).toContain("DATABASE_URL_OWNER");
    expect(message).toContain("Er is niets gemigreerd.");
  });
});
