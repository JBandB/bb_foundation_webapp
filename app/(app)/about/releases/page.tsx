/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { PageBody } from "@/components/page-body";
import { PageHeader } from "@/components/page-header";
import { DocView } from "@/components/ui/doc-view";
import { requireSession } from "@/lib/auth/session";
import { readDoc } from "@/lib/docs/read-doc";
import { labels } from "@/lib/i18n/labels";
import { APP_VERSION } from "@/lib/version";

/** Wat er per versie is veranderd, in gewone taal uit `RELEASE-NOTES-KORT.md`. */
export const metadata = { title: labels.about.tabReleases };

export default async function ReleasesPage() {
  /* Niet alleen op de layout leunen: die controleert niet bij elke weergave. */
  await requireSession();
  const blocks = await readDoc("releases");

  return (
    <>
      <PageHeader eyebrow={labels.about.eyebrow} title={labels.about.releasesTitle} actions={<span className="num text-muted-foreground text-[12px]">{APP_VERSION}</span>} />

      <PageBody>
        <p className="text-foreground-soft mb-5 max-w-[80ch] text-[13px]">{labels.about.releasesIntro}</p>
        {blocks.length === 0 ? <p className="text-muted-foreground text-[13px]">{labels.about.empty}</p> : <DocView blocks={blocks} />}
      </PageBody>
    </>
  );
}
