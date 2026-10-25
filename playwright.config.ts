/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end op de kernflow. Gebruik: pnpm e2e, of pnpm e2e:ui om mee te kijken.
 *
 * **Deze suite draait tegen een echte database en een echte server.** De dingen die hier fout gaan
 * zitten tussen de lagen in, en die ziet een unittest niet. Inloggen gaat via de dev-login, want een
 * echte SSO-flow is niet te automatiseren zonder een testaccount met een wachtwoord in een secret.
 *
 * De bestanden 00 tot 09 zijn van het template; het project begint bij 10. Playwright sorteert op
 * bestandsnaam, dus het nummer is de volgorde.
 */

const PORT = 3100;
const BASE_URL = `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  /** Maakt de database wakker en zet de staat terug, zie e2e/global-setup.ts. */
  globalSetup: "./e2e/global-setup.ts",
  /** Eén worker: de tests delen één gebruiker en één database, en parallel zouden ze elkaars staat weggooien. */
  workers: 1,
  fullyParallel: false,
  /** In CI niet stilletjes een `test.only` laten staan. */
  forbidOnly: Boolean(process.env.CI),
  /** Ook lokaal een herkansing: een serverloze database die net wakker wordt is traag, en een suite die daarop omvalt leert je niets. */
  retries: 1,
  reporter: process.env.CI === undefined ? "list" : [["list"], ["html", { open: "never" }]],
  /** Tien seconden: elke actie gaat over het netwerk naar de database, en de eerste verzoeken na het starten zijn het traagst. */
  expect: { timeout: 10_000 },

  use: {
    baseURL: BASE_URL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    locale: "nl-NL",
    timezoneId: "Europe/Amsterdam",
  },

  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],

  /**
   * Playwright start de applicatie zelf, met `next start` op een eigen poort: een productiebuild en
   * geen dev-server. Next weigert een tweede dev-server voor dezelfde map, en een productiebuild is wat
   * er straks op Vercel staat. Draai dus `pnpm build` voordat je `pnpm e2e` doet, of `pnpm e2e:all`.
   */
  webServer: {
    command: `node node_modules/next/dist/bin/next start --port ${PORT}`,
    url: BASE_URL,
    reuseExistingServer: false,
    timeout: 120_000,
    env: {
      /* Zonder deze twee staat de dev-login uit en komt er niemand binnen. De guard in dev-login.ts gooit als APP_ENV niet local is. */
      AUTH_DEV_LOGIN: "1",
      APP_ENV: "local",
      /* Auth.js is in productiemodus streng over de host; zonder deze twee weigert hij de callback zonder foutmelding. */
      AUTH_URL: BASE_URL,
      AUTH_TRUST_HOST: "true",
      /* Een vaste testwaarde, zodat e2e 04 beide kanten van de cronpoort kan bewijzen. Nooit de echte. */
      CRON_SECRET: "e2e-cron-secret",
    },
  },
});
