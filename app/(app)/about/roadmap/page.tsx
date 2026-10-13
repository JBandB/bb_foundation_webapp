/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { PageBody } from "@/components/page-body";
import { PageHeader } from "@/components/page-header";
import { DocView } from "@/components/ui/doc-view";
import { requireSession } from "@/lib/auth/session";
import { readDoc } from "@/lib/docs/read-doc";
import { labels } from "@/lib/i18n/labels";

/** De stand per onderdeel, rechtstreeks uit `docs/ROADMAP.md`. */
export const metadata = { title: labels.about.roadmapTitle };

export default async function RoadmapPage() {
  await requireSession();
  const blocks = await readDoc("roadmap");

  return (
    <>
      <PageHeader eyebrow={labels.about.eyebrow} title={labels.about.roadmapTitle} />

      <PageBody>
        <p className="text-foreground-soft mb-5 max-w-[80ch] text-[13px]">{labels.about.roadmapIntro}</p>
        {blocks.length === 0 ? <p className="text-muted-foreground text-[13px]">{labels.about.empty}</p> : <DocView blocks={blocks} />}
      </PageBody>
    </>
  );
}
