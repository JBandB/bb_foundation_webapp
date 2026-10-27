/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import type { NextConfig } from "next";

/**
 * De Next-instellingen die elk project uit het template deelt. `next.config.ts` van het project roept
 * `withTemplateDefaults({ ...eigen opties })` aan en blijft zo van het project, terwijl de headers en
 * de grenzen hier bij een update meebewegen.
 *
 * ---
 *
 * **De security headers, pragmatisch en niet maximaal.** De CSP staat op 'self' met `unsafe-inline`
 * voor scripts en styles, want Next hydrateert met inline scripts en Tailwind zet inline styles; een
 * nonce-CSP kan dat dichtzetten maar vraagt middleware per request en een testronde over elk scherm.
 * De echte risico's die hier dichtgaan: clickjacking (frame-ancestors), MIME-sniffing, een referrer die
 * interne URL's lekt, en browserfeatures die niemand gebruikt. XSS wordt niet door de CSP gedragen maar
 * door de code zelf: geen `dangerouslySetInnerHTML`, tekst wordt nooit als HTML gelezen.
 *
 * **HSTS en COOP staan in de code**, niet alleen bij de host. Vercel zet HSTS zelf, maar zonder
 * `includeSubDomains`, en transportbeveiliging hoort niet te hangen aan een platforminstelling die
 * niemand bewaakt. Twee jaar, met `includeSubDomains`: dat geldt voor de subdomeinen van de host die
 * de header stuurt, niet voor de rest van het domein erboven. Over http negeert een browser de header,
 * dus `next start` op localhost merkt er niets van. `Cross-Origin-Opener-Policy: same-origin` knipt de
 * lijn met een venster dat ons opende of dat wij openen; de inlog bij Microsoft is een redirect en geen
 * popup, dus daar breekt niets. En `X-Powered-By: Next.js` gaat uit: dat zegt alleen een aanvaller iets.
 *
 * **In ontwikkeling staat `unsafe-eval` erbij**, want de dev-server van Next draait HMR op eval. De
 * e2e-suite draait tegen `next start` en test dus de echte productieheaders.
 *
 * **Server actions nemen standaard één megabyte aan**, en Vercel hoogstens 4,5 MB per verzoek. De
 * grens staat hier op twaalf, ruim boven de eigen grens van vier megabyte in de bestandenmodule, zodat
 * nooit het framework weigert maar altijd onze eigen controle, met een tekst die zegt wat er aan de
 * hand is.
 *
 * **De documenten die "Over de tool" leest gaan mee de deploy in.** Next pakt alleen bestanden mee die
 * hij in de code ziet staan, en `readDoc` stelt zijn pad pas tijdens het draaien samen. Zonder deze regel
 * werkt het lokaal en is het op Vercel leeg.
 */
const CSP = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'"}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

export const TEMPLATE_HEADERS = [
  { key: "Content-Security-Policy", value: CSP },
  /* Voor browsers van voor frame-ancestors. Zegt hetzelfde. */
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
];

export const ABOUT_DOCUMENTS = ["./RELEASE-NOTES-KORT.md", "./docs/ROADMAP.md", "./docs/SPEC.md"];

export function withTemplateDefaults(project: NextConfig = {}): NextConfig {
  return {
    ...project,
    async headers() {
      const own = project.headers === undefined ? [] : await project.headers();
      return [{ source: "/(.*)", headers: TEMPLATE_HEADERS }, ...own];
    },
    experimental: {
      ...project.experimental,
      serverActions: {
        bodySizeLimit: "12mb",
        ...project.experimental?.serverActions,
      },
    },
    outputFileTracingIncludes: {
      "/about/**": ABOUT_DOCUMENTS,
      ...project.outputFileTracingIncludes,
    },
    poweredByHeader: project.poweredByHeader ?? false,
    reactStrictMode: true,
    // Typefouten mogen een build nooit stil passeren. Lint loopt apart in CI,
    // want Next 16 heeft de ingebouwde eslint-stap laten vallen.
    typescript: { ignoreBuildErrors: false, ...project.typescript },
  };
}
