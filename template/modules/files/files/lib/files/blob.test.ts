/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { blobPathFor, fileNameForType, randomSegment, resolveContentType, verifyContent } from "./blob";

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
  it("bouwt een pad per doel en entiteit met een willekeurig stuk en een veilige naam", () => {
    expect(blobPathFor("documents", "contract", "abc", "Offerte (v2) €.pdf", new Date("2026-10-03T08:00:00.000Z"), "a1b2c3d4")).toBe("documents/contract/abc/2026-10-03T08-00-00-000Z-a1b2c3d4-Offerte__v2___.pdf");
  });

  it("kiest het willekeurige stuk zelf als het niet wordt meegegeven", () => {
    const now = new Date("2026-10-03T08:00:00.000Z");
    expect(blobPathFor("documents", "contract", "abc", "a.pdf", now)).not.toBe(blobPathFor("documents", "contract", "abc", "a.pdf", now));
    expect(randomSegment()).toMatch(/^[0-9a-f]{8}$/);
  });
});

describe("fileNameForType", () => {
  it("geeft de naam de extensie van het gecontroleerde type", () => {
    expect(fileNameForType("run.bat", "csv")).toBe("run.csv");
    expect(fileNameForType("Offerte v2.PDF", "pdf")).toBe("Offerte v2.pdf");
    expect(fileNameForType("lijst", "csv")).toBe("lijst.csv");
  });

  it("haalt een pad en stuurtekens weg, en valt terug op document", () => {
    expect(fileNameForType("C:\\Users\\x\\rapport.pdf", "pdf")).toBe("rapport.pdf");
    expect(fileNameForType("../../etc/passwd", "csv")).toBe("passwd.csv");
    expect(fileNameForType("a\u0000b\nc.png", "png")).toBe("abc.png");
    expect(fileNameForType("...", "pdf")).toBe("document.pdf");
  });
});
