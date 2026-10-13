/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { labels } from "@/lib/i18n/labels";
import type { ModuleNavItem } from "@/lib/project/nav-item";

/** Mijn account in de rail: wachtwoord en tweestapsverificatie van wie is ingelogd. */
export const accountNavItem: ModuleNavItem = () => ({ href: "/account/security", label: labels.password.securityNav });
