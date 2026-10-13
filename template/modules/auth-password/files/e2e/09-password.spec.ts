/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { expect, test } from "@playwright/test";
import { ADMIN_ROLES, APP_ROLES } from "../lib/auth/roles";
import { labels } from "../lib/i18n/labels";
import { withDatabase } from "./helpers";

/**
 * De wachtwoordlogin van begin tot eind: een uitnodiging (rechtstreeks in de database gezet, want de
 * mail gaat de suite niet lezen), een wachtwoord kiezen, inloggen, en de vergrendeling na vijf
 * foute pogingen. Met een rol zonder beheerrecht, zodat tweestapsverificatie niet verplicht is.
 */
test.describe.configure({ mode: "serial" });

const role = APP_ROLES.find((candidate) => !ADMIN_ROLES.includes(candidate));
const email = `e2e-${randomUUID().slice(0, 8)}@voorbeeld.invalid`;
const password = "een zin die lang genoeg is";
const rawToken = randomBytes(32).toString("base64url");

test.beforeAll(async () => {
  test.skip(role === undefined, "dit project heeft alleen beheerdersrollen, en die moeten tweestapsverificatie instellen");
  await withDatabase(async (pool) => {
    const organisation = await pool.query<{ id: string }>("select id from organisations limit 1");
    const organisationId = organisation.rows[0]?.id;
    if (organisationId === undefined) throw new Error("geen organisatie in de testdatabase");
    const user = await pool.query<{ id: string }>(
      "insert into users (organisation_id, external_id, email, display_name, initials, roles) values ($1, $2, $3, $4, $5, $6) returning id",
      [organisationId, `local:${randomUUID()}`, email, "E2E Wachtwoord", "EW", [role]],
    );
    await pool.query("insert into auth_tokens (organisation_id, user_id, kind, token_hash, expires_at) values ($1, $2, 'invite', $3, now() + interval '1 hour')", [
      organisationId,
      user.rows[0]?.id,
      createHash("sha256").update(rawToken).digest("hex"),
    ]);
  });
});

test.afterAll(async () => {
  await withDatabase(async (pool) => {
    await pool.query("delete from auth_tokens where user_id in (select id from users where email = $1)", [email]);
    await pool.query("delete from credentials where user_id in (select id from users where email = $1)", [email]);
    await pool.query("delete from rate_limits where key like 'login:%'");
    await pool.query("delete from users where email = $1", [email]);
  });
});

test("een uitgenodigde collega kiest een wachtwoord en logt in", async ({ page }) => {
  await page.goto(`/sign-in/invite/${rawToken}`);
  await expect(page.getByRole("heading", { name: labels.password.inviteTitle })).toBeVisible();
  await page.getByLabel(labels.password.newPassword).fill(password);
  await page.getByLabel(labels.password.repeatPassword).fill(password);
  await page.getByRole("button", { name: labels.password.setPassword }).click();
  await expect(page.getByRole("status")).toHaveText(labels.password.inviteAccepted);

  await page.goto("/sign-in");
  await page.getByLabel(labels.password.email).fill(email);
  await page.getByLabel(labels.password.passwordField).fill(password);
  await page.getByRole("button", { name: labels.password.submit }).click();
  await expect(page.getByRole("link", { name: labels.nav.home })).toBeVisible();
});

test("de koppeling van de uitnodiging werkt maar één keer", async ({ page }) => {
  await page.goto(`/sign-in/invite/${rawToken}`);
  await expect(page.getByRole("alert")).toHaveText(labels.password.inviteExpired);
});

test("vijf foute wachtwoorden vergrendelen het account, met steeds dezelfde melding", async ({ page }) => {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    await page.goto("/sign-in");
    await page.getByLabel(labels.password.email).fill(email);
    await page.getByLabel(labels.password.passwordField).fill("dit is het niet");
    await page.getByRole("button", { name: labels.password.submit }).click();
    await expect(page.getByRole("alert")).toHaveText(labels.password.failed);
  }
  const locked = await withDatabase(async (pool) => {
    const row = await pool.query<{ locked: boolean }>("select locked_until > now() as locked from credentials where user_id = (select id from users where email = $1)", [email]);
    return row.rows[0]?.locked ?? false;
  });
  expect(locked).toBe(true);
});
