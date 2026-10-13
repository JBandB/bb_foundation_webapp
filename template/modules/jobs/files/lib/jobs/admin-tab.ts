/* template-owned (module jobs). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { can } from "@/lib/auth/can";
import { labels } from "@/lib/i18n/labels";
import type { AdminTab } from "@/lib/project/admin-tab";

/** Het tabblad Achtergrondwerk onder Beheer, voor wie het systeem mag zien. */
export const jobsAdminTab: AdminTab = (actor) => (can(actor, "admin:system") ? { href: "/admin/jobs", label: labels.jobs.tab } : null);
