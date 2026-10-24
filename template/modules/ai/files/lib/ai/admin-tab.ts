/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { can } from "@/lib/auth/can";
import { labels } from "@/lib/i18n/labels";
import type { AdminTab } from "@/lib/project/admin-tab";

/** Het tabblad AI onder Beheer, voor wie AI mag beheren. */
export const aiAdminTab: AdminTab = (actor) => (can(actor, "admin:ai") ? { href: "/admin/ai", label: labels.ai.tab } : null);
