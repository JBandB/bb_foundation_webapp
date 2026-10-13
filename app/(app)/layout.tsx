/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { NavRail, type NavItem } from "@/components/nav-rail";
import { SignOut } from "@/components/sign-out";
import { ThemeToggle } from "@/components/theme-toggle";
import { FeedbackButton } from "@/components/tool-feedback/feedback-button";
import { roleLabel } from "@/lib/auth/roles";
import { requireSession } from "@/lib/auth/session";
import { themeForRequest } from "@/lib/domain/theme-for-request";
import { labels } from "@/lib/i18n/labels";
import { PROJECT } from "@/lib/project/config.generated";
import { NAV_ITEMS } from "@/lib/project/registry.generated";
import { adminTabs } from "./admin/tabs";
import { projectNav } from "./nav.project";

/**
 * De schil om alles wat achter een login zit.
 *
 * Hier gebeurt de autorisatie van de navigatie, op de server. Wie iets niet mag, krijgt het item niet
 * in de HTML, in plaats van dat het met CSS verborgen wordt. Dit is laag één van drie: de rail
 * filtert, de pagina assert, de leesfunctie assert.
 *
 * Er staat met opzet geen middleware voor deze routes. Middleware draait op de edge runtime en
 * `auth.ts` trekt de databaselaag mee, die daar niet hoort. Deze layout is server-side en redirect
 * zelf: dezelfde bescherming op de plek waar de code al draait.
 */
export default async function AppLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const actor = await requireSession();
  /* Gedeeld met de root-layout via `cache`, dus dit is geen tweede query. */
  const theme = await themeForRequest();

  /* De bestemmingen van het project, dan die van de modules, en Beheer zodra er een tabblad voor je is. */
  const items: NavItem[] = [...projectNav(actor)];
  for (const item of NAV_ITEMS) {
    const resolved = item(actor);
    if (resolved !== null) items.push(resolved);
  }
  if (adminTabs(actor).length > 0) items.push({ href: "/admin", label: labels.nav.admin });

  return (
    <div className="grid min-h-screen grid-cols-[236px_minmax(0,1fr)] max-md:grid-cols-1">
      <NavRail
        items={items}
        user={{ name: actor.name, initials: actor.initials, roleLabel: roleLabel(actor.roles) }}
        signOut={<SignOut />}
        themeToggle={PROJECT.darkMode === "off" ? null : <ThemeToggle theme={theme} />}
      />
      <main className="min-w-0">{children}</main>

      {/* De feedbackknop rechtsonder, op elk scherm achter de sessie: een melding gaat over waar je op dat moment bent. */}
      <FeedbackButton />
    </div>
  );
}
