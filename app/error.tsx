/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { useEffect } from "react";
import { labels } from "@/lib/i18n/labels";
import { APP_VERSION } from "@/lib/version";

/**
 * De foutpagina. Een fout mag niet stil zijn, en ook niet in een andere taal dan de rest.
 *
 * Zonder `error.tsx` toont elke serverfout het rauwe scherm van de hosting: Engels, zonder context,
 * zonder versienummer. **De digest staat erop.** Next stuurt de echte foutmelding met opzet niet naar
 * de browser (er kan een naam of een query in staan), maar wel een hash waarmee de fout in de serverlogs
 * terug te vinden is. Die code plus de versie is precies wat een melding bruikbaar maakt.
 *
 * De prop heet `retry` in deze Next-versie, niet `reset`.
 */
export default function ErrorPage({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    /* De serverkant is al gelogd. Dit is voor de devtools-console. */
    console.error(error);
  }, [error]);

  return (
    <main className="grid min-h-svh place-items-center px-6">
      <div className="flex max-w-[440px] flex-col gap-3">
        <h1 className="font-display text-[22px] leading-tight">{labels.error.title}</h1>
        <p className="text-foreground-soft text-[14px]">{labels.error.body}</p>

        <div>
          <button
            type="button"
            onClick={() => retry()}
            className="border-border-strong rounded-md hover:border-accent-quiet min-h-[40px] cursor-pointer border px-4 text-[14px] transition-colors duration-100 active:translate-y-px"
          >
            {labels.error.retry}
          </button>
        </div>

        <p className="num text-subtle-foreground text-[11px]">
          {APP_VERSION}
          {error.digest !== undefined && ` · ${labels.error.code} ${error.digest}`}
        </p>
      </div>
    </main>
  );
}
