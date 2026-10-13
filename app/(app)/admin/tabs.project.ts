import type { SubNavItem } from "@/components/ui/sub-nav";
import type { Actor } from "@/lib/auth/actor";

/**
 * De eigen tabbladen van dit project onder Beheer, achter het recht dat erbij hoort:
 *
 *     if (can(actor, "catalogue:write")) items.push({ href: "/admin/catalogue", label: labels.catalogue.tab });
 *
 * Elke pagina erachter assert hetzelfde recht opnieuw; de balk filtert alleen.
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export function projectAdminTabs(_actor: Actor): SubNavItem[] {
  return [];
}
