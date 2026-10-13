/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use client";

import { brandColors } from "@/lib/brand/tokens";
import { labels } from "@/lib/i18n/labels";
import { PROJECT } from "@/lib/project/config.generated";
import { APP_VERSION } from "@/lib/version";

/**
 * De foutpagina voor als de rootlayout zelf omvalt. Zeldzaam, maar dan is er niets anders.
 *
 * Eigen `<html>` en `<body>`, en inline stijlen: dit bestand vervangt de rootlayout en krijgt de
 * globale CSS dus niet mee. De kleuren komen daarom uit `lib/brand/tokens.ts`, de enige plek buiten de
 * stylesheets die een kleurwaarde mag hebben. Bewust kaal: hoe minder dit bestand nodig heeft, hoe
 * kleiner de kans dat het zelf ook omvalt.
 */
export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang={PROJECT.uiLanguage}>
      <body
        style={{
          margin: 0,
          minHeight: "100svh",
          display: "grid",
          placeItems: "center",
          background: brandColors.surface,
          color: brandColors.ink,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <main style={{ maxWidth: 440, padding: 24 }}>
          <h1 style={{ fontSize: 22, lineHeight: 1.2, margin: 0 }}>{labels.error.title}</h1>
          <p style={{ fontSize: 14, margin: "12px 0" }}>{labels.error.body}</p>
          <button
            type="button"
            onClick={() => retry()}
            style={{
              font: "inherit",
              fontSize: 14,
              padding: "8px 16px",
              borderRadius: 6,
              border: `1px solid ${brandColors.primary}`,
              background: "transparent",
              color: brandColors.ink,
              cursor: "pointer",
            }}
          >
            {labels.error.retry}
          </button>
          <p style={{ fontSize: 11, opacity: 0.6, marginTop: 16 }}>
            {APP_VERSION}
            {error.digest !== undefined && ` · ${labels.error.code} ${error.digest}`}
          </p>
        </main>
      </body>
    </html>
  );
}
