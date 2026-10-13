/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { can } from "@/lib/auth/can";
import { labels } from "@/lib/i18n/labels";
import type { AdminTab } from "@/lib/project/admin-tab";

/** Beheer, Accounts: uitnodigen, rollen, deactiveren. Toegang (van de kern) blijft de leeslijst. */
export const accountsAdminTab: AdminTab = (actor) => (can(actor, "admin:access") ? { href: "/admin/accounts", label: labels.password.adminTab } : null);
