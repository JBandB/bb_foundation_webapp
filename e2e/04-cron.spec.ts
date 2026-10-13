/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { expect, test } from "@playwright/test";

/**
 * De cronroute is dicht zonder het geheim en open met het geheim. De suite zet CRON_SECRET op een
 * vaste testwaarde in playwright.config.ts, zodat beide kanten te bewijzen zijn.
 */
test("de cronroute geeft 404 zonder of met een verkeerd token, en antwoordt met het goede", async ({ request }) => {
  const without = await request.get("/api/cron/prune");
  expect(without.status()).toBe(404);

  const wrong = await request.get("/api/cron/prune", { headers: { authorization: "Bearer niet-het-geheim" } });
  expect(wrong.status()).toBe(404);

  const right = await request.get("/api/cron/prune", { headers: { authorization: "Bearer e2e-cron-secret" } });
  expect(right.status()).toBe(200);
  const body = (await right.json()) as Record<string, number>;
  expect(typeof body.rate_limits).toBe("number");
});
