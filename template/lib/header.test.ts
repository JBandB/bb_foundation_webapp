/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { generatedHeaderLine, ownedHeaderLine, readHeader, withHeader } from "./header";

describe("de kopregel", () => {
  it("volgt de commentaarvorm van het bestandstype", () => {
    expect(ownedHeaderLine("lib/x.ts", "core")).toBe("/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */");
    expect(ownedHeaderLine("docs/x.md", "jobs")).toBe("<!-- template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->");
    expect(ownedHeaderLine("lib/db/sql/x.sql", "core")).toMatch(/^-- template-owned/);
    expect(ownedHeaderLine(".github/workflows/ci.yml", "core")).toMatch(/^# template-owned/);
    expect(ownedHeaderLine("tsconfig.json", "core")).toMatch(/^\/\/ template-owned/);
    expect(ownedHeaderLine(".gitattributes", "core")).toMatch(/^# template-owned/);
    expect(ownedHeaderLine(".githooks/commit-msg", "core")).toMatch(/^# template-owned/);
    expect(ownedHeaderLine(".env.example", "core")).toMatch(/^# template-owned/);
    expect(ownedHeaderLine("project.config.json", "core")).toBeUndefined();
    expect(ownedHeaderLine("app/fonts/x.woff2", "core")).toBeUndefined();
    expect(generatedHeaderLine("app/theme.css", "theme")).toBe(
      "/* template-generated (theme) uit project.config.json. Niet bewerken: pnpm template:generate schrijft hem opnieuw. */",
    );
  });

  it("leest de kop achter een HTML-doctype, want een commentaar vóór de doctype is geen kop", () => {
    expect(readHeader("<!doctype html>\n<!-- template-owned (module core). Wordt overschreven -->\n<html>")).toEqual({ kind: "owned", module: "core" });
    expect(withHeader("<!DOCTYPE html>\n<html>", "<!-- template-owned (module core). x -->")).toBe("<!DOCTYPE html>\n<!-- template-owned (module core). x -->\n<html>");
  });

  it("leest de kop, ook achter een shebang", () => {
    expect(readHeader("/* template-owned (module jobs). Wordt overschreven */\nconst x = 1;")).toEqual({ kind: "owned", module: "jobs" });
    expect(readHeader("#!/bin/sh\n# template-owned (module core). Wordt overschreven\necho")).toEqual({ kind: "owned", module: "core" });
    expect(readHeader("/* template-generated (tokens) uit project.config.json. */")).toEqual({ kind: "generated", generator: "tokens" });
    expect(readHeader("const x = 1;\n/* template-owned (module core). */")).toBeUndefined();
    expect(readHeader("")).toBeUndefined();
  });

  it("zet de kop op zijn plek en vervangt een oude", () => {
    const header = ownedHeaderLine("x.ts", "core") ?? "";
    expect(withHeader("const x = 1;\n", header)).toBe(`${header}\nconst x = 1;\n`);
    expect(withHeader("/* template-owned (module oud). */\nconst x = 1;\n", header)).toBe(`${header}\nconst x = 1;\n`);
    expect(withHeader("#!/bin/sh\necho\n", "# template-owned (module core). x")).toBe("#!/bin/sh\n# template-owned (module core). x\necho\n");
  });
});
