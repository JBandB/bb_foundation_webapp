/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { PageBody } from "@/components/page-body";
import { PageHeader } from "@/components/page-header";
import { DocView } from "@/components/ui/doc-view";
import { requireSession } from "@/lib/auth/session";
import { decisionStand, readDoc } from "@/lib/docs/read-doc";
import { labels } from "@/lib/i18n/labels";

/** Het besluitenlog uit `docs/SPEC.md`: wat er is besloten, en wat het kost. */
export const metadata = { title: labels.about.decisionsTitle };

export default async function DecisionsPage() {
  await requireSession();
  const blocks = await readDoc("decisions");
  /* De stand erbij, zodat de vraag "is dit actueel" beantwoord is voordat hij opkomt. */
  const stand = decisionStand(blocks);

  return (
    <>
      <PageHeader eyebrow={labels.about.eyebrow} title={labels.about.decisionsTitle} />

      <PageBody>
        <p className="text-foreground-soft mb-2 max-w-[80ch] text-[13px]">{labels.about.decisionsIntro}</p>
        {stand.count > 0 && <p className="text-muted-foreground mb-5 text-[12px]">{labels.about.decisionsStand(stand.count, stand.highest)}</p>}
        {blocks.length === 0 ? <p className="text-muted-foreground text-[13px]">{labels.about.empty}</p> : <DocView blocks={blocks} />}
      </PageBody>
    </>
  );
}
