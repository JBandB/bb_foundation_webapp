/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Mag dit verzoek een schrijvende route handler in die op de sessiecookie leunt?
 *
 * Server actions krijgen van Next een herkomstcontrole: de host in `Origin` moet gelijk zijn aan
 * `X-Forwarded-Host` of `Host`. Een route handler krijgt die niet. De sessiecookie is
 * `SameSite=Lax`: een POST van een andere site gaat niet mee, maar een van een ander subdomein van
 * hetzelfde domein wel, want dat is dezelfde site. Met `content-type: text/plain` is zo'n POST een
 * "simple request" zonder preflight, en `request.json()` kijkt niet naar het contenttype. Zo kan een
 * pagina elders onder hetzelfde domein schrijven op naam van een ingelogde gebruiker.
 *
 * **Drie toetsen, in deze volgorde.**
 *
 * 1. `Sec-Fetch-Site` aanwezig en niet `same-origin`: weigeren (403). Elke moderne browser zet hem,
 *    en een pagina kan hem niet vervalsen.
 * 2. `Origin` aanwezig en zijn host niet gelijk aan die van het verzoek: weigeren (403). De host van
 *    het verzoek zoals Next hem bepaalt: de eerste waarde van `X-Forwarded-Host`, anders `Host`.
 * 3. Het contenttype is niet `application/json`: weigeren (415). Daarmee dwingt elke andere
 *    herkomst een preflight af, en die beantwoorden we niet.
 *
 * **Zonder beide herkomstheaders gaat hij door** naar de contenttypetoets. Zo'n verzoek komt niet uit
 * een browser (een script, de e2e), en een script draagt alleen een sessiecookie die iemand hem zelf
 * heeft gegeven. Dezelfde afweging als Next maakt bij een server action zonder `Origin`.
 *
 * Gebruik: als eerste regel van elke route handler die schrijft en op de sessiecookie leunt, vóór
 * `requireActor()`, zodat een geweigerd verzoek ook de database niet wekt. Crons en webhooks met een
 * eigen token vallen erbuiten. Puur: de headers erin, een besluit eruit.
 */

export type RequestOriginVerdict = { ok: true } | { ok: false; status: 403 | 415; reason: string };

/** De host van het verzoek, zoals de herkomstcontrole van Next hem leest. Kleine letters. */
export function requestHost(headers: Headers): string | undefined {
  const forwarded = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  if (forwarded !== undefined && forwarded !== "") return forwarded.toLowerCase();
  const host = headers.get("host")?.trim();
  return host === undefined || host === "" ? undefined : host.toLowerCase();
}

/** De host uit een `Origin`-waarde, of niets als het geen URL is (zoals de waarde `null`). */
function originHost(origin: string): string | undefined {
  try {
    return new URL(origin).host.toLowerCase();
  } catch {
    return undefined;
  }
}

/** Het mediatype zonder parameters: `application/json; charset=utf-8` wordt `application/json`. */
function mediaType(contentType: string | null): string {
  return (contentType ?? "").split(";")[0]?.trim().toLowerCase() ?? "";
}

export function requestOriginVerdict(headers: Headers): RequestOriginVerdict {
  const site = headers.get("sec-fetch-site");
  if (site !== null && site.trim().toLowerCase() !== "same-origin") {
    return { ok: false, status: 403, reason: "Dit verzoek komt niet van deze site." };
  }

  const origin = headers.get("origin");
  if (origin !== null) {
    const from = originHost(origin);
    const host = requestHost(headers);
    if (from === undefined || host === undefined || from !== host) {
      return { ok: false, status: 403, reason: "Dit verzoek komt niet van deze site." };
    }
  }

  if (mediaType(headers.get("content-type")) !== "application/json") {
    return { ok: false, status: 415, reason: "Verwacht een body met content-type application/json." };
  }

  return { ok: true };
}
