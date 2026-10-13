/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { expect, test } from "@playwright/test";
import { signIn } from "./helpers";

/**
 * De downloadroute: zonder sessie een 401, met sessie een 404 voor wat niet bestaat, en nooit iets
 * dat zegt of een id bestaat zonder dat je het mag zien.
 */
test("de downloadroute is dicht zonder sessie", async ({ request }) => {
  const response = await request.get("/api/files/00000000-0000-0000-0000-000000000000");
  expect(response.status()).toBe(401);
});

test("met sessie is een onbekend of onzinnig id een 404", async ({ page }) => {
  await signIn(page);
  expect((await page.request.get("/api/files/00000000-0000-0000-0000-000000000000")).status()).toBe(404);
  expect((await page.request.get("/api/files/geen-uuid")).status()).toBe(404);
});
