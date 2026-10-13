/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { parseLsRemoteTags } from "./git";

describe("parseLsRemoteTags", () => {
  it("leest de tags en laat de ^{}-verwijzingen weg", () => {
    const stdout = [
      "0123456789abcdef0123456789abcdef01234567\trefs/tags/v1.0.0",
      "89abcdef0123456789abcdef0123456789abcdef\trefs/tags/v1.0.0^{}",
      "fedcba9876543210fedcba9876543210fedcba98\trefs/tags/v1.1.0",
      "",
    ].join("\n");
    expect(parseLsRemoteTags(stdout)).toEqual(["v1.0.0", "v1.1.0"]);
    expect(parseLsRemoteTags("")).toEqual([]);
  });
});
