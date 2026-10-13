import { PageBody } from "@/components/page-body";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/ui/empty-state";
import { requireSession } from "@/lib/auth/session";
import { labels } from "@/lib/i18n/labels";

/**
 * Het beginscherm. Een dashboard dat samenvat en doorverwijst (`SummaryBlock`, `Stat`); de diepte
 * zit achter de links. Wat hier komt te staan volgt uit het projectplan.
 *
 * Elke pagina begint met `requireSession()` en, zodra er iets te lezen valt, met een `can()`.
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export const metadata = { title: labels.home.title };

export default async function HomePage() {
  await requireSession();

  return (
    <>
      <PageHeader eyebrow={labels.home.eyebrow} title={labels.home.title} />
      <PageBody>
        <EmptyState title={labels.home.emptyTitle} body={labels.home.emptyBody} />
      </PageBody>
    </>
  );
}
