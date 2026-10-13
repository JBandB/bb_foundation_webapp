/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { requireCron } from "./guard";

/** De cronpoort weigert zonder geheim en met een verkeerd token, en raakt dan de database niet. */
afterEach(() => {
  vi.unstubAllEnvs();
});

const request = (authorization?: string): Request => new Request("https://voorbeeld.invalid/api/cron/prune", { headers: authorization === undefined ? {} : { authorization } });

describe("requireCron", () => {
  it("weigert met een 500 als het geheim niet is ingericht", async () => {
    vi.stubEnv("CRON_SECRET", "");
    const result = await requireCron(request("Bearer iets"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.response.status).toBe(500);
  });

  it("weigert met een 404 zonder token of met een verkeerd token", async () => {
    vi.stubEnv("CRON_SECRET", "het-juiste-geheim");
    for (const header of [undefined, "Bearer fout", "het-juiste-geheim", "Bearer het-juiste-geheim-niet"]) {
      const result = await requireCron(request(header));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.response.status).toBe(404);
    }
  });
});
