/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { brandColors } from "@/lib/brand/tokens";
import { themeForRequest } from "@/lib/domain/theme-for-request";
import { labels } from "@/lib/i18n/labels";
import { PROJECT } from "@/lib/project/config.generated";
import "./globals.css";

/**
 * De fonts, zelf gehost.
 *
 * Geen `<link>` naar een fontdienst en ook geen `next/font/google`: dat eerste is een externe request
 * per bezoeker met zijn IP-adres erin, en dat tweede haalde de bestanden bij elke build op, tot de
 * dienst een ochtend onbereikbaar was en er geen build was. De drie variabele fonts (latin, OFL)
 * staan in `app/fonts/` en gaan via `next/font/local`. Eigen letters van een project komen er in
 * `app/project.css` vooraan bij te staan; hier verandert dan niets.
 */
const display = localFont({ src: "./fonts/space-grotesk-latin-var.woff2", weight: "300 700", variable: "--font-space-grotesk", display: "swap" });
const body = localFont({ src: "./fonts/manrope-latin-var.woff2", weight: "200 800", variable: "--font-manrope", display: "swap" });
const mono = localFont({ src: "./fonts/jetbrains-mono-latin-var.woff2", weight: "100 800", variable: "--font-jetbrains-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: labels.app.name, template: `%s | ${labels.app.name}` },
  description: labels.app.description,
};

export const viewport: Viewport = {
  /* De tabbalk van de browser hoort bij het merk en niet bij de modus van de kijker. */
  themeColor: brandColors.sidebar,
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  /*
   * De modus in het HTML dat de server verstuurt, anders ziet wie donker koos eerst een wit scherm.
   * Gedeeld met de rail via `cache`, dus dit is geen tweede query.
   */
  const theme = await themeForRequest();

  return (
    <html lang={PROJECT.uiLanguage} className={`${theme} ${display.variable} ${body.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
