/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { blobPathFor, resolveContentType, verifyContent } from "./blob";

describe("resolveContentType", () => {
  it("vertrouwt de extensie als de browser vaag of fout is", () => {
    expect(resolveContentType("lijst.csv", "application/vnd.ms-excel")).toBe("text/csv");
    expect(resolveContentType("lijst.csv", "")).toBe("text/csv");
    expect(resolveContentType("boek.xlsx", "application/octet-stream")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(resolveContentType("brief.pdf", "application/octet-stream")).toBe("application/pdf");
    expect(resolveContentType("foto.png", "image/png")).toBe("image/png");
  });
});

describe("verifyContent", () => {
  it("herkent de eerste bytes van een type en weigert wat niet past", () => {
    expect(verifyContent(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31]), "application/pdf")).toBeUndefined();
    expect(verifyContent(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), "image/png")).toBeUndefined();
    expect(verifyContent(Uint8Array.from([0x00, 0x01]), "image/png")).toBe("mismatch");
  });

  it("weigert een csv met binaire inhoud of een vermomd ander bestand", () => {
    expect(verifyContent(new TextEncoder().encode("a;b\n1;2\n"), "text/csv")).toBeUndefined();
    expect(verifyContent(Uint8Array.from([0x61, 0x00, 0x62]), "text/csv")).toBe("notText");
    expect(verifyContent(Uint8Array.from([0x25, 0x50, 0x44, 0x46, 0x2d]), "text/csv")).toBe("notCsv");
  });

  it("weigert een Office-bestand met macro's", () => {
    const zipWithMacro = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.from("xl/vbaProject.bin", "latin1")]);
    expect(verifyContent(new Uint8Array(zipWithMacro), "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")).toBe("macros");
  });
});

describe("blobPathFor", () => {
  it("bouwt een pad per doel en entiteit met een veilige naam", () => {
    expect(blobPathFor("documents", "contract", "abc", "Offerte (v2) €.pdf", new Date("2026-10-03T08:00:00.000Z"))).toBe("documents/contract/abc/2026-10-03T08-00-00-000Z-Offerte__v2___.pdf");
  });
});
