/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { contentDisposition } from "./content-disposition";

describe("contentDisposition", () => {
  it("geeft een ASCII-naam en de echte naam als UTF-8", () => {
    expect(contentDisposition("attachment", "Offerte €2026 (v1).pdf", "document")).toBe(`attachment; filename="Offerte _2026 (v1).pdf"; filename*=UTF-8''Offerte%20%E2%82%AC2026%20%28v1%29.pdf`);
  });

  it("valt terug op een veilige naam als er niets leesbaars overblijft", () => {
    expect(contentDisposition("inline", "日本語.pdf", "document")).toBe(`inline; filename="document.pdf"; filename*=UTF-8''%E6%97%A5%E6%9C%AC%E8%AA%9E.pdf`);
    expect(contentDisposition("attachment", "", "document")).toBe(`attachment; filename="document"; filename*=UTF-8''document`);
  });

  it("laat een aanhalingsteken de kop niet breken", () => {
    expect(contentDisposition("attachment", 'a"b.txt', "document")).toContain('filename="a_b.txt"');
  });
});
