/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import type { SubNavItem } from "@/components/ui/sub-nav";
import type { Actor } from "@/lib/auth/actor";
import { can } from "@/lib/auth/can";
import { labels } from "@/lib/i18n/labels";
import { ADMIN_TABS } from "@/lib/project/registry.generated";
import { projectAdminTabs } from "./tabs.project";

/**
 * De tabbladen onder Beheer, in deze volgorde: die van de kern, die van de toegepaste modules (uit het
 * gegenereerde register), die van het project (tabs.project.ts). Een lege lijst betekent dat deze
 * persoon Beheer niet ziet: de layout geeft dan een 404 en de rail toont het item niet.
 */
export function adminTabs(actor: Actor): SubNavItem[] {
  const items: SubNavItem[] = [];

  if (can(actor, "admin:access")) items.push({ href: "/admin/access", label: labels.admin.tabAccess });
  if (can(actor, "admin:system")) {
    items.push({ href: "/admin/system", label: labels.admin.tabSystem });
    items.push({ href: "/admin/feedback", label: labels.admin.tabFeedback });
  }

  for (const tab of ADMIN_TABS) {
    const item = tab(actor);
    if (item !== null) items.push(item);
  }

  items.push(...projectAdminTabs(actor));

  return items;
}
