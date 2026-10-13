/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De registers: wat de toegepaste modules aan de kern aanmelden. De kern importeert alleen de
 * gegenereerde bestanden en kent geen module bij naam. Drie bestanden, om kringen te vermijden en
 * omdat teksten een eigen plek hebben:
 *
 * - `lib/project/registry.generated.ts`: inlogmethoden, koppelingen en beheertabbladen (server);
 * - `lib/project/ui-registry.generated.ts`: componenten op het inlogscherm (die importeren auth.ts);
 * - `lib/i18n/template/modules.generated.ts`: de teksten van de modules, onder hun eigen naam.
 */

import { generatedHeaderLine } from "../lib/header";
import type { Manifest, ModuleManifest } from "../lib/manifest";

interface Registration {
  readonly name: string;
  readonly from: string;
  readonly as?: string | null;
}

type RegistryKey = keyof ModuleManifest["registry"];

function collect(manifest: Manifest, applied: readonly string[], key: RegistryKey): Registration[] {
  return applied.flatMap((name) => manifest.modules[name]?.registry[key] ?? []);
}

function imports(entries: readonly Registration[]): string[] {
  const byModule = new Map<string, string[]>();
  for (const entry of entries) {
    const names = byModule.get(entry.from) ?? [];
    if (!names.includes(entry.name)) names.push(entry.name);
    byModule.set(entry.from, names);
  }
  return [...byModule.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0)).map(([from, names]) => `import { ${names.sort().join(", ")} } from "${from}";`);
}

const list = (entries: readonly Registration[]): string => `[${entries.map((entry) => entry.name).join(", ")}]`;

export function generateRegistry(manifest: Manifest, applied: readonly string[]): string {
  const providers = collect(manifest, applied, "loginProviders");
  const health = collect(manifest, applied, "healthProviders");
  const tabs = collect(manifest, applied, "adminTabs");
  const navItems = collect(manifest, applied, "navItems");

  return [
    generatedHeaderLine("lib/project/registry.generated.ts", "registry") ?? "",
    "/**",
    " * Wat de toegepaste modules aan de kern aanmelden, aan de serverkant: inlogmethoden, koppelingen,",
    " * beheertabbladen en bestemmingen in de rail. De kern importeert alleen dit bestand en kent geen",
    " * enkele module bij naam; een module die niet is toegepast, staat hier niet en wordt dus ook niet",
    " * gebundeld.",
    " *",
    " * De componenten voor het inlogscherm staan apart in `ui-registry.generated.ts`: die importeren",
    " * `signIn` uit auth.ts, en auth.ts leest dit bestand, dus samen zou dat een kring zijn.",
    " */",
    'import type { HealthProvider } from "@/lib/integrations/health";',
    'import type { LoginProvider } from "@/lib/auth/login-provider";',
    'import type { AdminTab } from "@/lib/project/admin-tab";',
    'import type { ModuleNavItem } from "@/lib/project/nav-item";',
    ...imports([...providers, ...health, ...tabs, ...navItems]),
    "",
    "/** De inlogmethoden, in volgorde. De dev-login komt er lokaal bij in lib/auth/providers/index.ts. */",
    `export const LOGIN_PROVIDERS: readonly LoginProvider[] = ${list(providers)};`,
    "",
    "/** De koppelingen die Beheer, Systeem toont met hun stand. */",
    `export const HEALTH_PROVIDERS: readonly HealthProvider[] = ${list(health)};`,
    "",
    "/** De tabbladen die modules onder Beheer zetten, na die van de kern en vóór die van het project. */",
    `export const ADMIN_TABS: readonly AdminTab[] = ${list(tabs)};`,
    "",
    "/** De bestemmingen die modules in de rail zetten, na die van het project en vóór Beheer. */",
    `export const NAV_ITEMS: readonly ModuleNavItem[] = ${list(navItems)};`,
    "",
  ].join("\n");
}

export function generateUiRegistry(manifest: Manifest, applied: readonly string[]): string {
  const buttons = collect(manifest, applied, "loginButtons");
  const extras = collect(manifest, applied, "loginExtras");

  return [
    generatedHeaderLine("lib/project/ui-registry.generated.ts", "registry") ?? "",
    "/**",
    " * Wat de toegepaste modules op het inlogscherm zetten. Apart van `registry.generated.ts` omdat deze",
    " * componenten `signIn` uit auth.ts importeren, en auth.ts het serverregister leest.",
    " */",
    'import type { ComponentType } from "react";',
    ...imports([...buttons, ...extras]),
    "",
    "/** De knoppen op het inlogscherm, één per inlogmethode. */",
    `export const LOGIN_BUTTONS: readonly ComponentType[] = ${list(buttons)};`,
    "",
    "/** Wat er verder op het inlogscherm staat, zoals het hulpformulier van de module messaging. */",
    `export const LOGIN_EXTRAS: readonly ComponentType[] = ${list(extras)};`,
    "",
  ].join("\n");
}

const IDENTIFIER = /^[A-Za-z_$][A-Za-z0-9_$]*$/;

export function generateModuleLabels(manifest: Manifest, applied: readonly string[]): string {
  const entries = applied.flatMap((name) => (manifest.modules[name]?.registry.labels ?? []).map((entry) => ({ module: name, ...entry })));

  return [
    generatedHeaderLine("lib/i18n/template/modules.generated.ts", "labels") ?? "",
    "/**",
    " * De teksten van de toegepaste modules, in de taal van het project, elk onder de naam van de module.",
    " * `lib/i18n/template/index.ts` zet ze naast de teksten van de kern, zodat `labels.jobs.title` bestaat",
    " * zodra de module jobs is toegepast, en niet daarvoor.",
    " */",
    ...(entries.length > 0 ? ['import { PROJECT } from "@/lib/project/config.generated";'] : []),
    ...imports(entries),
    "",
    "export const moduleLabels = {",
    ...entries.map((entry) => {
      const key = entry.as ?? entry.module;
      return `  ${IDENTIFIER.test(key) ? key : JSON.stringify(key)}: ${entry.name}[PROJECT.uiLanguage],`;
    }),
    "} as const;",
    "",
  ].join("\n");
}
