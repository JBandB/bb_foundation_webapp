import type { NavItem } from "@/components/nav-rail";
import type { Actor } from "@/lib/auth/actor";
import { labels } from "@/lib/i18n/labels";
import { PROJECT } from "@/lib/project/config.generated";

/**
 * De bestemmingen in de rail van dit project, in volgorde. Beheer komt er automatisch achter als de
 * gebruiker daar een tabblad heeft.
 *
 * Filter hier met `can(actor, ...)`: wie een scherm niet mag zien, krijgt het item niet in de HTML.
 * Elk scherm assert daarna zelf opnieuw, want een rail die filtert is geen autorisatie.
 *
 *     if (can(actor, "order:read")) items.push({ href: "/orders", label: labels.orders.navLabel });
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export function projectNav(_actor: Actor): NavItem[] {
  return [{ href: PROJECT.homePath, label: labels.home.navLabel }];
}
