/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { emptyLock, hashText, normaliseNewlines, parseLock, serialiseLock, type Lock } from "./lock";

describe("hashes", () => {
  it("geven CRLF en LF dezelfde hash, en laten een BOM weg", () => {
    expect(hashText("a\r\nb\r\n")).toBe(hashText("a\nb\n"));
    expect(hashText("﻿a\nb")).toBe(hashText("a\nb"));
    expect(normaliseNewlines("x\ry")).toBe("x\ny");
  });
});

describe("de lock", () => {
  const lock: Lock = {
    ...emptyLock("0.1.0", null, "2026-10-02T09:30:00Z"),
    modules: { core: { schemaVersion: 1, migrations: ["0000_baseline"] } },
    files: {
      "lib/version.ts": { module: "core", class: "seed", hash: "a".repeat(64), seeded: true, seededIn: "0.1.0", sourceHash: "b".repeat(64), shippedHash: null },
      "app/layout.tsx": { module: "core", class: "owned", hash: "c".repeat(64), seeded: false, seededIn: null, sourceHash: null, shippedHash: null },
    },
    merged: {
      packageJson: { scripts: { typecheck: "tsc --noEmit", build: "next build" }, dependencies: {}, devDependencies: {} },
      vercelCrons: [],
      envBlocks: ["core"],
      claudeBlocks: ["core"],
      gitignoreBlocks: ["core"],
    },
    adopted: ["zzz.ts", "aaa.ts"],
  };

  it("schrijft gesorteerd, één regel per bestand, en leest zichzelf terug", () => {
    const text = serialiseLock(lock);
    const lines = text.split("\n");
    expect(lines[0]).toBe("{");
    expect(lines[1]).toBe('  "lockVersion": 1,');
    expect(lines.indexOf('    "app/layout.tsx": {"module":"core","class":"owned","hash":"' + "c".repeat(64) + '","seeded":false,"seededIn":null,"sourceHash":null,"shippedHash":null},')).toBeGreaterThan(0);
    expect(text.indexOf('"app/layout.tsx"')).toBeLessThan(text.indexOf('"lib/version.ts"'));
    expect(text.indexOf('"build"')).toBeLessThan(text.indexOf('"typecheck"'));
    expect(text.endsWith("\n")).toBe(true);

    const parsed = parseLock(text);
    expect(parsed.adopted).toEqual(["aaa.ts", "zzz.ts"]);
    expect(parsed.files["lib/version.ts"]?.seededIn).toBe("0.1.0");
    expect(serialiseLock(parsed)).toBe(text);
  });

  it("schrijft een lege lock zonder bestanden netjes", () => {
    const text = serialiseLock(emptyLock("0.1.0", null, "2026-10-02T09:30:00Z"));
    expect(text).toContain('  "files": {},');
    expect(parseLock(text).files).toEqual({});
  });

  it("weigert een lock die niet klopt, met het pad erbij", () => {
    expect(() => parseLock('{ "lockVersion": 2 }')).toThrow(/lockVersion: moet precies 1 zijn/);
    expect(() => parseLock("nee")).toThrow(/geen geldige JSON/);
  });
});
