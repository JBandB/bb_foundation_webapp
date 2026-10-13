/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { bumpVersion, compareVersions, formatVersion, latestTag, parseVersion } from "./semver";

describe("semver", () => {
  it("leest met en zonder v, en weigert de rest", () => {
    expect(parseVersion("1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseVersion("v1.2.3")).toEqual({ major: 1, minor: 2, patch: 3 });
    expect(parseVersion("1.2")).toBeUndefined();
    expect(parseVersion("01.2.3")).toBeUndefined();
    expect(parseVersion("1.2.3-beta")).toBeUndefined();
  });

  it("vergelijkt per positie", () => {
    const v = (text: string) => parseVersion(text) ?? { major: 0, minor: 0, patch: 0 };
    expect(compareVersions(v("1.2.3"), v("1.2.3"))).toBe(0);
    expect(compareVersions(v("1.10.0"), v("1.9.9"))).toBe(1);
    expect(compareVersions(v("0.9.9"), v("1.0.0"))).toBe(-1);
  });

  it("kiest de hoogste tag en slaat andere tags over", () => {
    expect(latestTag(["v1.2.0", "v1.10.0", "v1.9.9", "release-2", "1.11.0"])).toBe("v1.10.0");
    expect(latestTag(["geen"])).toBeUndefined();
  });

  it("verhoogt en schrijft", () => {
    const v = { major: 1, minor: 2, patch: 3 };
    expect(formatVersion(bumpVersion(v, "patch"), true)).toBe("v1.2.4");
    expect(formatVersion(bumpVersion(v, "minor"))).toBe("1.3.0");
    expect(formatVersion(bumpVersion(v, "major"))).toBe("2.0.0");
  });
});
