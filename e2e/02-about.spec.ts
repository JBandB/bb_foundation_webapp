/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { expect, test } from "@playwright/test";
import { labels } from "../lib/i18n/labels";
import { APP_VERSION } from "../lib/version";
import { signIn } from "./helpers";

/**
 * Over de tool leest de documenten uit de repo. De kop van `RELEASE-NOTES-KORT.md` hoort gelijk te
 * zijn aan `APP_VERSION`: dat is de afspraak uit CLAUDE.md, en deze test houdt hem vast.
 */
test("wat er nieuw is, toont de lopende versie uit de korte release notes", async ({ page }) => {
  await signIn(page);
  await page.goto("/about/releases");

  await expect(page.getByRole("heading", { name: labels.about.releasesTitle, level: 1 })).toBeVisible();
  await expect(page.getByRole("heading", { name: APP_VERSION, exact: true })).toBeVisible();
});

test("de besluiten tonen D1 als kaart, met de stand erbij", async ({ page }) => {
  await signIn(page);
  await page.goto("/about/decisions");

  await expect(page.getByRole("heading", { name: labels.about.decisionsTitle, level: 1 })).toBeVisible();
  await expect(page.getByText("D1", { exact: true })).toBeVisible();
  await expect(page.getByText(/D\d+\.$/)).toBeVisible();
});

test("de roadmap is te lezen, en /about stuurt door", async ({ page }) => {
  await signIn(page);
  await page.goto("/about");
  await expect(page).toHaveURL(/\/about\/releases$/);

  await page.getByRole("link", { name: labels.about.tabRoadmap }).click();
  await expect(page.getByRole("heading", { name: labels.about.roadmapTitle, level: 1 })).toBeVisible();
});
