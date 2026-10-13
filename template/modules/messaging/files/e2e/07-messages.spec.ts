/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { expect, test } from "@playwright/test";
import { labels } from "../lib/i18n/labels";
import { signIn } from "./helpers";

/**
 * Beheer, Berichten: de soorten uit de catalogus staan er met hun instelling, het logboek staat er,
 * en de cronroute van de outbox is dicht zonder het geheim. Daarna het hulpformulier op het
 * inlogscherm: zonder sessie, met een melding die bij een beheerder terechtkomt. In volgorde, want de
 * tweede test heeft de beheerder nodig die de eerste bij het inloggen laat ontstaan.
 */
test.describe.configure({ mode: "serial" });

test("een beheerder ziet de soorten met hun instelling en het logboek", async ({ page }) => {
  await signIn(page);
  await page.goto("/admin/messages");
  await expect(page.getByRole("heading", { name: labels.messaging.title, level: 1 })).toBeVisible();
  await expect(page.getByText(labels.messaging.kindNames.integration_stuck ?? "integration_stuck").first()).toBeVisible();
  await expect(page.getByRole("heading", { name: labels.messaging.logTitle })).toBeVisible();
  await expect(page.getByRole("button", { name: labels.messaging.flush })).toBeVisible();
});

test("de cronroute van de outbox is dicht zonder het geheim en telt met het geheim", async ({ request }) => {
  const without = await request.get("/api/cron/outbox");
  expect(without.status()).toBe(404);

  const right = await request.get("/api/cron/outbox", { headers: { authorization: "Bearer e2e-cron-secret" } });
  expect(right.status()).toBe(200);
  const body = (await right.json()) as Record<string, unknown>;
  expect(typeof body.sent).toBe("number");
  expect(typeof body.pruned).toBe("number");
});

test("wie er niet in komt, kan vanaf het inlogscherm een melding sturen", async ({ page }) => {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: labels.messaging.loginHelpTitle }).click();
  await page.getByLabel(labels.messaging.loginHelpName).fill("E2E Tester");
  await page.getByLabel(labels.messaging.loginHelpEmail).fill("e2e@voorbeeld.invalid");
  await page.getByLabel(labels.messaging.loginHelpMessage).fill("Een melding uit de e2e-suite.");
  await page.getByRole("button", { name: labels.messaging.loginHelpSend }).click();
  await expect(page.getByRole("status")).toHaveText(labels.messaging.loginHelpDone);
});
