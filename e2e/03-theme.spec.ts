/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { expect, test } from "@playwright/test";
import { labels } from "../lib/i18n/labels";
import { PROJECT } from "../lib/project/config.generated";
import { signIn } from "./helpers";

/**
 * De donkere modus: het schuifje in de rail wisselt, de keuze staat in de database en blijft dus na
 * herladen, en de inlogpagina blijft licht.
 */
test("de modus wisselt via het schuifje en blijft na herladen", async ({ page }) => {
  test.skip(PROJECT.darkMode === "off", "de donkere modus staat uit in project.config.json");
  await signIn(page);
  const html = page.locator("html");
  await expect(html).toHaveClass(/light/);

  const toggle = page.getByRole("switch", { name: labels.nav.themeDark }).first();
  await expect(toggle).toHaveAttribute("aria-checked", "false");
  await toggle.click();

  await expect(html).toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await expect(page.getByRole("switch", { name: labels.nav.themeDark }).first()).toHaveAttribute("aria-checked", "true");

  /* Terug naar licht, zodat de volgende test schoon begint. */
  await page.getByRole("switch", { name: labels.nav.themeDark }).first().click();
  await expect(page.locator("html")).toHaveClass(/light/);
});
