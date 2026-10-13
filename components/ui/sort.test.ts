/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { ariaSort, compareBy, sortFrom, sortHref } from "./sort";

describe("sorteren via de URL", () => {
  it("leest alleen toegestane sleutels en valt anders terug op niets", () => {
    expect(sortFrom({ sort: "name", dir: "desc" }, ["name", "date"])).toEqual({ key: "name", direction: "desc" });
    expect(sortFrom({ sort: "salary" }, ["name"])).toEqual({ key: undefined, direction: "asc" });
    expect(sortFrom({}, ["name"])).toEqual({ key: undefined, direction: "asc" });
  });

  it("draait de richting om op dezelfde kolom en houdt de andere parameters", () => {
    expect(sortHref("/items", { q: "x", sort: "name", dir: "asc" }, "name", { key: "name", direction: "asc" })).toBe("/items?q=x&sort=name&dir=desc");
    expect(sortHref("/items", { q: "x" }, "date", { key: "name", direction: "asc" })).toBe("/items?q=x&sort=date");
    expect(sortHref("/items", { q: "" }, "date", { key: "date", direction: "desc" })).toBe("/items?sort=date");
  });

  it("zegt aria-sort alleen op de actieve kolom", () => {
    expect(ariaSort("name", { key: "name", direction: "asc" })).toBe("ascending");
    expect(ariaSort("name", { key: "name", direction: "desc" })).toBe("descending");
    expect(ariaSort("date", { key: "name", direction: "asc" })).toBe("none");
  });

  it("vergelijkt tekst, getallen en bigints, met leeg achteraan", () => {
    const rows = [{ v: "b" }, { v: null }, { v: "a" }];
    expect(compareBy(rows, (row) => row.v, "asc").map((row) => row.v)).toEqual(["a", "b", null]);
    expect(compareBy(rows, (row) => row.v, "desc").map((row) => row.v)).toEqual(["b", "a", null]);
    const numbers = [{ n: 3n }, { n: 1n }, { n: 2n }];
    expect(compareBy(numbers, (row) => row.n, "asc").map((row) => row.n)).toEqual([1n, 2n, 3n]);
  });
});
