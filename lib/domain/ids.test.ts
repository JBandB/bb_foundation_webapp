/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { isUuid, sameId } from "./ids";

const ID = "b57cbc18-02f9-4695-bd99-3d5c2af8c85d";

describe("sameId", () => {
  it("ziet een id in hoofdletters als hetzelfde id, zoals Postgres doet", () => {
    expect(sameId(ID.toUpperCase(), ID)).toBe(true);
    expect(sameId(ID, ID)).toBe(true);
  });

  it("ziet een ander id als een ander id", () => {
    expect(sameId("5d863605-0886-42db-bda2-978a85a7026a", ID)).toBe(false);
    expect(sameId("", ID)).toBe(false);
  });
});

describe("isUuid", () => {
  it("neemt hoofdletters aan, want de vorm is hetzelfde", () => {
    expect(isUuid(ID)).toBe(true);
    expect(isUuid(ID.toUpperCase())).toBe(true);
  });

  it("weigert wat geen uuid is", () => {
    expect(isUuid("abc")).toBe(false);
    expect(isUuid(`${ID}x`)).toBe(false);
    expect(isUuid("")).toBe(false);
  });
});
