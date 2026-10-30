/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { expect, test, type Page } from "@playwright/test";
import { labels } from "../lib/i18n/labels";
import { signIn } from "./helpers";

/**
 * De nonce-CSP (besluit D14). Zie `proxy.ts` en `lib/security/csp.ts`.
 *
 * ---
 *
 * **Wat deze test vasthoudt.** Elke pagina krijgt een CSP zonder `unsafe-inline` voor scripts, met
 * een nonce die per verzoek anders is, en elk script in de HTML van de server draagt die nonce. En
 * vooral: de browser weigert niets. Een geweigerd script is een pagina die niet hydrateert, en dat
 * merk je pas als een knop niets doet; daarom telt deze test de meldingen van de browser zelf en
 * klikt hij op iets dat alleen met JavaScript werkt.
 */

/** De meldingen die de browser geeft als hij iets weigert om de CSP. */
function collectViolations(page: Page): string[] {
  const violations: string[] = [];
  page.on("console", (message) => {
    if (/Content Security Policy/i.test(message.text())) violations.push(message.text());
  });
  return violations;
}

test("elke pagina heeft een CSP met een nonce, en elk script in de HTML draagt hem", async ({ page }) => {
  const first = await page.request.get("/sign-in");
  const second = await page.request.get("/sign-in");
  const policy = first.headers()["content-security-policy"] ?? "";
  const scripts = policy.split("; ").find((part) => part.startsWith("script-src ")) ?? "";

  expect(scripts).toMatch(/'nonce-[A-Za-z0-9+/=]+'/);
  expect(scripts).toContain("'strict-dynamic'");
  expect(scripts).not.toContain("unsafe-inline");
  expect(policy).toContain("frame-ancestors 'none'");
  /* Eén CSP, niet ook nog een vaste uit de configuratie. */
  expect(first.headersArray().filter((header) => header.name.toLowerCase() === "content-security-policy")).toHaveLength(1);
  /* Een nonce is per verzoek: twee keer dezelfde is geen nonce. */
  expect(second.headers()["content-security-policy"]).not.toBe(policy);

  /*
   * Elk script in de HTML van de server draagt de nonce van zijn eigen header. Wat Next daarna zelf
   * invoegt (de chunks) heeft er geen nodig: dat erft het vertrouwen via `'strict-dynamic'`, en of
   * de browser het toelaat, zegt de telling van weigeringen hieronder.
   */
  const html = await first.text();
  const nonce = /'nonce-([A-Za-z0-9+/=]+)'/.exec(scripts)?.[1] ?? "";
  const tags = html.match(/<script\b[^>]*>/g) ?? [];
  expect(tags.length).toBeGreaterThan(0);
  expect(tags.filter((tag) => !tag.includes(`nonce="${nonce}"`))).toEqual([]);

  const violations = collectViolations(page);
  await page.goto("/sign-in");
  await expect(page.getByLabel(labels.login.devEmail)).toBeVisible();
  expect(violations).toEqual([]);
});

test("na het inloggen weigert de browser niets, en de pagina is gehydrateerd", async ({ page }) => {
  const violations = collectViolations(page);
  await signIn(page);

  for (const path of ["/home", "/about/releases", "/admin/access", "/admin/system"]) {
    await page.goto(path);
    await expect(page.locator("main").first()).toBeVisible();
  }

  /* Gehydrateerd: het feedbackpaneel gaat open op een klik, en dat kan alleen met JavaScript. */
  await page.getByRole("button", { name: labels.toolFeedback.open }).click();
  await expect(page.getByRole("button", { name: labels.toolFeedback.close })).toBeVisible();

  expect(violations).toEqual([]);
});
