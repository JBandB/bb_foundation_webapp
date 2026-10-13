/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { expect, test } from "@playwright/test";
import { labels } from "../lib/i18n/labels";
import { APP_VERSION } from "../lib/version";

/**
 * Het inlogscherm: het merk, de titel, wat er nieuw is met de versie die ook in de rail staat, en
 * altijd licht, want dit scherm is technisch publiek en hoort er voor iedereen hetzelfde uit te zien.
 */
test("het inlogscherm toont het merk, de versie en is licht", async ({ page }) => {
  await page.goto("/sign-in");

  await expect(page.getByRole("img", { name: labels.app.name })).toBeVisible();
  await expect(page.getByRole("heading", { name: labels.login.title })).toBeVisible();
  await expect(page.getByText(labels.login.whatsNew(APP_VERSION))).toBeVisible();

  /* De inlogschil zet de lichte modus vast, wat de voorkeur van een eerdere sessie ook was. */
  await expect(page.locator("div.light").first()).toBeVisible();

  /* De dev-login staat er lokaal; in een deploy kan hij niet bestaan. */
  await expect(page.getByRole("button", { name: labels.login.devSubmit })).toBeVisible();
});

test("een mislukte inlog zegt dat, en lekt niets", async ({ page }) => {
  await page.goto("/sign-in?error=Configuration");
  const alert = page.getByRole("alert");
  await expect(alert).toBeVisible();
  await expect(alert).toHaveText(labels.login.failed);
});
