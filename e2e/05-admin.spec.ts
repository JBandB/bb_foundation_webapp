/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { expect, test } from "@playwright/test";
import { ADMIN_ROLES, APP_ROLES } from "../lib/auth/roles.generated";
import { labels } from "../lib/i18n/labels";
import { APP_VERSION } from "../lib/version";
import { DEV_USER, signIn } from "./helpers";

/** De eerste rol zonder beheerrecht uit de configuratie; een project met alleen beheerders heeft er geen. */
const NON_ADMIN_ROLE = APP_ROLES.find((role) => !ADMIN_ROLES.includes(role));

/**
 * Beheer: een beheerder ziet de tabbladen en de stand van het systeem; wie geen enkel beheerrecht
 * heeft krijgt een 404, en geen "geen toegang", want welke schermen er bestaan is niets wat iemand
 * zonder rechten hoeft te weten.
 */
test("een beheerder komt op Toegang en Systeem", async ({ page }) => {
  await signIn(page);

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/access$/);
  await expect(page.getByRole("heading", { name: labels.access.title, level: 1 })).toBeVisible();
  await expect(page.getByText(DEV_USER.email)).toBeVisible();
  await expect(page.getByRole("heading", { name: labels.access.matrixTitle })).toBeVisible();

  await page.getByRole("link", { name: labels.admin.tabSystem }).click();
  await expect(page.getByRole("heading", { name: labels.system.title, level: 1 })).toBeVisible();
  await expect(page.getByText(APP_VERSION).first()).toBeVisible();
  /* De database loopt gelijk met de code, anders zegt het scherm dat als eerste. */
  await expect(page.getByText(/migraties|migrations/)).toBeVisible();
});

test("wie geen beheerrecht heeft, krijgt op Beheer een 404 en geen railitem", async ({ page }) => {
  test.skip(NON_ADMIN_ROLE === undefined, "dit project heeft alleen beheerdersrollen");
  await signIn(page, DEV_USER.email, NON_ADMIN_ROLE);

  await expect(page.getByRole("link", { name: labels.nav.admin })).toHaveCount(0);
  const response = await page.goto("/admin/access");
  expect(response?.status()).toBe(404);
  await expect(page.getByRole("heading", { name: labels.notFound.title })).toBeVisible();
});

test("feedback insturen komt onder Beheer, Feedback terecht", async ({ page }) => {
  await signIn(page);
  const title = `E2E melding ${Date.now()}`;

  await page.getByRole("button", { name: labels.toolFeedback.open }).click();
  await page.getByLabel(labels.toolFeedback.titleField).fill(title);
  await page.getByLabel(labels.toolFeedback.bodyField).fill("Een melding uit de e2e-suite.");
  await page.getByRole("button", { name: labels.toolFeedback.send }).click();
  await expect(page.getByRole("status")).toBeVisible();

  await page.goto("/admin/feedback");
  await expect(page.getByText(title)).toBeVisible();
});
