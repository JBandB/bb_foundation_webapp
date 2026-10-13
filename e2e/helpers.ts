/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { expect, type Page } from "@playwright/test";
import { Pool } from "@neondatabase/serverless";
import { labels } from "../lib/i18n/labels";
import { PROJECT } from "../lib/project/config.generated";

/**
 * Gedeelde stappen voor de e2e-suite. Bewust klein gehouden: een testsuite met een eigen framework
 * eromheen is een tweede applicatie die je ook moet onderhouden. Eigen helpers van het project staan
 * in `e2e/helpers.project.ts`.
 */

/** Het eerste dev-account uit project.config.json, waar de suite mee inlogt. */
export const DEV_USER = PROJECT.devUsers[0] ?? { email: "dev@voorbeeld.invalid", displayName: "Dev", roles: ["admin"] };

/**
 * Inloggen via de dev-login.
 *
 * Gaat langs het formulier en niet via een cookie die de test zelf zet: dat bewijst dat de inlogpagina
 * en de sessie werken, en dat is de eerste stap van elke echte gebruiker. Eén herkansing, want Auth.js
 * stuurt je bij elke fout in `authorize` terug naar de inlog zonder te zeggen waarom, en een trage
 * database is zo'n fout.
 *
 * Wacht op de rail en niet op `networkidle`: Next haalt elke zichtbare link op de achtergrond op, en
 * die stilte komt er niet betrouwbaar.
 */
export async function signIn(page: Page, email: string = DEV_USER.email, roles?: string): Promise<void> {
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    await page.goto("/sign-in");
    await page.getByLabel(labels.login.devEmail).fill(email);
    await page.getByLabel(labels.login.devRoles).fill(roles ?? "");
    await page.getByRole("button", { name: labels.login.devSubmit }).click();

    const railVisible = await page
      .getByRole("link", { name: labels.nav.home })
      .waitFor({ state: "visible", timeout: 15_000 })
      .then(() => true)
      .catch(() => false);

    if (railVisible) break;
  }

  await expect(page.getByRole("link", { name: labels.nav.home })).toBeVisible();
}

/** Een query op de database van de suite, voor opruimen of een fixture. */
export async function withDatabase<T>(fn: (pool: Pool) => Promise<T>): Promise<T> {
  const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
  if (url === undefined || url === "") throw new Error("DATABASE_URL ontbreekt, zie playwright.config.ts.");

  const pool = new Pool({ connectionString: url });
  try {
    return await fn(pool);
  } finally {
    await pool.end();
  }
}

/** De meldingen die een test over de tool zelf heeft ingestuurd, weer weghalen. */
export async function removeToolFeedback(titleLike: string): Promise<void> {
  await withDatabase((pool) => pool.query("delete from tool_feedback where title like $1", [titleLike]));
}
