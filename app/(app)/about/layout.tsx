/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { SubNav } from "@/components/ui/sub-nav";
import { requireSession } from "@/lib/auth/session";
import { labels } from "@/lib/i18n/labels";

/**
 * Over deze tool: wat er nieuw is, wat er komt, en wat we bewust niet doen.
 *
 * De drie documenten worden bij elke PR bijgewerkt, maar zijn alleen te lezen door wie de repo
 * openklapt. Vanaf de feedbackknop moet je kunnen kijken of iets al gebouwd is, gepland staat, of met
 * opzet is afgewezen. Dat scheelt feedback die er al drie keer ligt, en het maakt een afwijzing
 * navolgbaar in plaats van stil. Geen railitem: de weg erheen is de feedbackknop, op elk scherm.
 */
export default async function AboutLayout({ children }: { children: React.ReactNode }) {
  await requireSession();

  return (
    <>
      <SubNav
        items={[
          { href: "/about/releases", label: labels.about.tabReleases },
          { href: "/about/roadmap", label: labels.about.tabRoadmap },
          { href: "/about/decisions", label: labels.about.tabDecisions },
        ]}
      />
      {children}
    </>
  );
}
