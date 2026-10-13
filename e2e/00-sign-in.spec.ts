/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { expect, test } from "@playwright/test";
import { labels } from "../lib/i18n/labels";
import { PROJECT } from "../lib/project/config.generated";
import { APP_VERSION } from "../lib/version";
import { DEV_USER, signIn } from "./helpers";

/**
 * De eerste stap van elke gebruiker: inloggen, de rail zien, en op het beginscherm uitkomen.
 */
test("inloggen via de dev-login brengt je op het beginscherm met de rail", async ({ page }) => {
  await signIn(page);

  await expect(page).toHaveURL(new RegExp(`${PROJECT.homePath}$`));
  await expect(page.getByText(DEV_USER.displayName)).toBeVisible();
  /* De versie linksonder, zodat "werkt het al?" te beantwoorden is. */
  await expect(page.getByText(APP_VERSION).first()).toBeVisible();
});

test("zonder sessie word je naar de inlog gestuurd, en uitloggen werkt", async ({ page }) => {
  await page.goto(PROJECT.homePath);
  await expect(page).toHaveURL(/\/sign-in/);

  await signIn(page);
  await page.getByRole("button", { name: labels.nav.signOut }).first().click();
  await expect(page).toHaveURL(/\/sign-in/);
});
