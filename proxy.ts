/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { NextResponse, type NextRequest } from "next/server";
import { contentSecurityPolicy, newNonce } from "@/lib/security/csp";

/**
 * Per verzoek een nonce en de CSP die hem noemt. Zie `lib/security/csp.ts` en besluit D14. In Next
 * 16 heet middleware `proxy.ts`.
 *
 * ---
 *
 * **De CSP staat op het verzoek én op het antwoord.** Next leest de nonce uit de CSP-header van het
 * verzoek en zet hem op zijn eigen scripts; de browser leest de header van het antwoord. Zonder de
 * eerste krijgt geen enkel script de nonce en blijft de pagina dood, zonder de tweede is er geen
 * policy. De andere security headers blijven in `lib/config/next-base.ts`: die zijn vast en gelden
 * ook voor `/api` en de statische bestanden. Een tweede CSP daar zou de browser allebei afdwingen.
 *
 * **Alleen pagina's.** Statische bestanden, de routes van Auth.js en de rest van `/api` (cron,
 * bestanden) krijgen geen CSP: daar staat geen HTML in. Een prefetch van `next/link` ook niet, zoals
 * de documentatie van Next aanraadt; de scripts die de router daarna invoegt, erven het vertrouwen
 * via `'strict-dynamic'`.
 *
 * **Geen autorisatie hier.** Dit bestand bekijkt geen sessie en weigert niets: dat blijft in
 * `requireSession()` en `can()`, op de plek waar het hoort (CLAUDE.md regel 11).
 */
export function proxy(request: NextRequest): NextResponse {
  const nonce = newNonce();
  const policy = contentSecurityPolicy(nonce, { development: process.env.NODE_ENV === "development" });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", policy);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  matcher: [
    {
      /*
       * Alles behalve `/api`, de bestanden van Next en wat er in `public/` staat (een pad met een
       * extensie). Een pagina heeft in een project uit het template nooit een punt in zijn laatste deel.
       */
      source: "/((?!api/|_next/static|_next/image|.*\\.[a-zA-Z0-9]+$).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
