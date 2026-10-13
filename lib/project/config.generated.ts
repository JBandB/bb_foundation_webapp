/* template-generated (project) uit project.config.json. Niet bewerken: pnpm template:generate schrijft hem opnieuw. */
import type { ProjectInfo } from "./types";

/**
 * Wat de applicatie van de projectconfiguratie weet. Alleen deze velden; niets hiervan is geheim en
 * alles mag in de browserbundel belanden. De rest van project.config.json (hosting, intake van de
 * wizard, templatevoorkeuren) komt hier bewust niet in. De vorm staat in `./types`.
 */
export const PROJECT: ProjectInfo = {
  name: "Webapp",
  shortName: "Webapp",
  slug: "webapp",
  description: "Een nieuw project uit het template.",
  organisationName: "Organisatie",
  uiLanguage: "nl",
  locale: "nl-NL",
  timezone: "Europe/Amsterdam",
  currency: "EUR",
  systemEmail: "systeem@voorbeeld.invalid",
  productionUrl: null,
  homePath: "/home",
  authProvider: "entra",
  darkMode: "auto",
  logo: { kind: "wordmark", path: null, darkPath: null },
  devUsers: [
    { email: "dev@voorbeeld.invalid", displayName: "Dev Beheerder", roles: ["admin"] },
  ],
  modules: ["auth-entra"],
  messaging: { transport: "smtp", teams: false },
  password: { mfaRequiredFor: "admins" },
};
