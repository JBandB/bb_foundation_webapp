/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De Content Security Policy, met een nonce per verzoek. Zie besluit D14 en `proxy.ts`.
 *
 * ---
 *
 * **Waarom een nonce.** Een vaste CSP met `script-src 'self' 'unsafe-inline'` laat elk inline
 * script toe, want Next hydrateert met inline scripts. Dan voert de browser ook een script uit dat
 * een aanvaller via een fout in onze weergave op de pagina krijgt: de CSP droeg XSS niet, alleen de
 * code zelf. Met een nonce voert de browser alleen scripts uit die het geheime getal van dit
 * verzoek dragen. Next zet dat getal zelf op zijn scripts: het leest het uit de CSP-header van het
 * verzoek, die `proxy.ts` zet.
 *
 * **`'strict-dynamic'`**: een script met de nonce mag andere scripts laden (de chunks van Next), en
 * die erven het vertrouwen. Een lijst met hosts erbij is dan overbodig, en `'self'` blijft alleen
 * staan voor browsers die `'strict-dynamic'` niet kennen.
 *
 * **Styles houden `'unsafe-inline'`**: React zet `style`-attributen, en een nonce geldt niet voor
 * een attribuut. Een style kan geen script uitvoeren; het risico daar is klein en de prijs van
 * dichtzetten groot (elke `style={...}` herschrijven).
 *
 * **`worker-src 'self'` uitdrukkelijk**: zonder valt een worker terug op `script-src`, en daar
 * negeert `'strict-dynamic'` het woord `'self'`.
 *
 * **Een eigen `<script>` of `next/script` in een project** krijgt de nonce uit
 * `(await headers()).get("x-nonce")`; zonder weigert de browser hem.
 *
 * Puur, zodat het te testen is zonder verzoek.
 */

/** Een onvoorspelbaar getal voor één verzoek, als base64. 128 bits, zoals CSP aanraadt. */
export function newNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

export function contentSecurityPolicy(nonce: string, options: { development: boolean }): string {
  return [
    "default-src 'self'",
    /* In ontwikkeling draait de HMR van Next op eval; in productie nooit. */
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${options.development ? " 'unsafe-eval'" : ""}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self'",
    "worker-src 'self'",
    "manifest-src 'self'",
    "object-src 'none'",
    "frame-ancestors 'none'",
    "base-uri 'self'",
    "form-action 'self'",
  ].join("; ");
}
