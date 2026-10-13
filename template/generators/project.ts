/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Schrijft lib/project/config.generated.ts: wat de applicatie van de configuratie weet, en niets meer.
 * Nooit `hosting`, `template` of `intake`.
 */

import { deriveLocale } from "../lib/config";
import type { ProjectConfig } from "../lib/config-schema";
import { generatedHeaderLine } from "../lib/header";

const quote = (value: string): string => JSON.stringify(value);

export function generateProject(config: ProjectConfig): string {
  const { project, brand, auth } = config;
  const logo =
    brand.logo.kind === "image"
      ? `{ kind: "image", path: ${quote(brand.logo.path ?? "")}, darkPath: ${brand.logo.darkPath === null ? "null" : quote(brand.logo.darkPath)} }`
      : `{ kind: "wordmark", path: null, darkPath: null }`;
  const devUsers = auth.devUsers.map((user) => `    { email: ${quote(user.email)}, displayName: ${quote(user.displayName)}, roles: [${user.roles.map(quote).join(", ")}] },`);

  return [
    generatedHeaderLine("lib/project/config.generated.ts", "project") ?? "",
    'import type { ProjectInfo } from "./types";',
    "",
    "/**",
    " * Wat de applicatie van de projectconfiguratie weet. Alleen deze velden; niets hiervan is geheim en",
    " * alles mag in de browserbundel belanden. De rest van project.config.json (hosting, intake van de",
    " * wizard, templatevoorkeuren) komt hier bewust niet in. De vorm staat in `./types`.",
    " */",
    "export const PROJECT: ProjectInfo = {",
    `  name: ${quote(project.name)},`,
    `  shortName: ${quote(project.shortName)},`,
    `  slug: ${quote(project.slug)},`,
    `  description: ${quote(project.description)},`,
    `  organisationName: ${quote(project.organisation.name)},`,
    `  uiLanguage: ${quote(project.uiLanguage)},`,
    `  locale: ${quote(deriveLocale(project.uiLanguage))},`,
    `  timezone: ${quote(project.timezone)},`,
    `  currency: ${quote(project.currency)},`,
    `  systemEmail: ${quote(project.systemEmail)},`,
    `  productionUrl: ${project.productionUrl === null ? "null" : quote(project.productionUrl)},`,
    `  homePath: ${quote(project.homePath)},`,
    `  authProvider: ${quote(auth.provider)},`,
    `  darkMode: ${quote(brand.darkMode)},`,
    `  logo: ${logo},`,
    devUsers.length === 0 ? "  devUsers: []," : `  devUsers: [\n${devUsers.join("\n")}\n  ],`,
    `  modules: [${config.modules.map(quote).join(", ")}],`,
    `  messaging: { transport: ${quote(config.messaging.transport)}, teams: ${config.messaging.teams ? "true" : "false"} },`,
    `  password: { mfaRequiredFor: ${quote(auth.password.mfaRequiredFor)} },`,
    "};",
    "",
  ].join("\n");
}
