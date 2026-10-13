/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { patchVercelJson, VERCEL_SCHEMA_URL } from "./vercel-json";

const desired = {
  defaults: { regions: ["fra1"] },
  crons: [
    { path: "/api/cron/jobs", schedule: "*/15 5-18 * * 1-5" },
    { path: "/api/cron/prune", schedule: "30 3 * * *" },
  ],
};

describe("vercel.json", () => {
  it("maakt een nieuw bestand met schema, standaardwaarden en crons", () => {
    const result = patchVercelJson("", desired, [], []);
    expect(JSON.parse(result.text)).toEqual({ $schema: VERCEL_SCHEMA_URL, regions: ["fra1"], crons: desired.crons });
    expect(result.managedCrons).toEqual(["/api/cron/jobs", "/api/cron/prune"]);
    expect(result.changes).toEqual(['regions gezet op ["fra1"]', "cron /api/cron/jobs toegevoegd (*/15 5-18 * * 1-5)", "cron /api/cron/prune toegevoegd (30 3 * * *)"]);
  });

  it("is een vast punt en laat gezette standaardwaarden daarna met rust", () => {
    const first = patchVercelJson(JSON.stringify({ regions: ["ams1"] }), desired, [], []);
    expect((JSON.parse(first.text) as { regions: string[] }).regions).toEqual(["ams1"]);
    const second = patchVercelJson(first.text, desired, first.managedCrons, []);
    expect(second.text).toBe(first.text);
    expect(second.changes).toEqual([]);
  });

  it("houdt crons van het project, verwijdert oude templatecrons en werkt een rooster bij", () => {
    const current = JSON.stringify({
      regions: ["fra1"],
      crons: [
        { path: "/api/cron/eigen", schedule: "0 6 * * *" },
        { path: "/api/cron/oud", schedule: "0 7 * * *" },
        { path: "/api/cron/jobs", schedule: "0 * * * *" },
      ],
    });
    const result = patchVercelJson(current, desired, ["/api/cron/oud", "/api/cron/jobs"], []);
    expect((JSON.parse(result.text) as { crons: unknown[] }).crons).toEqual([{ path: "/api/cron/eigen", schedule: "0 6 * * *" }, ...desired.crons]);
    expect(result.changes).toEqual([
      "cron /api/cron/oud verwijderd (niet meer in het template)",
      "cron /api/cron/jobs van 0 * * * * naar */15 5-18 * * 1-5",
      "cron /api/cron/prune toegevoegd (30 3 * * *)",
    ]);
  });

  it("laat een cron uit keepCrons met rust en zegt wat het template voorstelt", () => {
    const current = JSON.stringify({ crons: [{ path: "/api/cron/jobs", schedule: "0 * * * *" }] });
    const result = patchVercelJson(current, desired, ["/api/cron/jobs"], ["/api/cron/jobs"]);
    expect((JSON.parse(result.text) as { crons: unknown[] }).crons).toEqual([{ path: "/api/cron/jobs", schedule: "0 * * * *" }, { path: "/api/cron/prune", schedule: "30 3 * * *" }]);
    expect(result.managedCrons).toEqual(["/api/cron/prune"]);
    expect(result.warnings).toEqual(["cron /api/cron/jobs houdt het rooster van het project (0 * * * *); het template stelt */15 5-18 * * 1-5 voor (template.keepCrons)"]);
  });

  it("haalt de sleutel crons weg als er geen overblijven", () => {
    const current = JSON.stringify({ $schema: VERCEL_SCHEMA_URL, regions: ["fra1"], crons: [{ path: "/api/cron/oud", schedule: "0 7 * * *" }] });
    const result = patchVercelJson(current, { defaults: {}, crons: [] }, ["/api/cron/oud"], []);
    expect(JSON.parse(result.text)).toEqual({ $schema: VERCEL_SCHEMA_URL, regions: ["fra1"] });
  });
});
