/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { can } from "@/lib/auth/can";
import { labels } from "@/lib/i18n/labels";
import type { AdminTab } from "@/lib/project/admin-tab";

/** Het tabblad Berichten onder Beheer, voor wie de berichten mag beheren. */
export const messagingAdminTab: AdminTab = (actor) => (can(actor, "admin:messages") ? { href: "/admin/messages", label: labels.messaging.tab } : null);
