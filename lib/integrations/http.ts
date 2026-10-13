/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `fetch` met een tijdslimiet. Een aanroep naar buiten zonder limiet kan een cron of een server action
 * tot de limiet van het platform laten hangen, en dat wordt stil afgekapt; twintig seconden is lang
 * genoeg voor elke dienst die we aanroepen en kort genoeg om binnen een ronde te blijven.
 */
export const DEFAULT_TIMEOUT_MS = 20_000;

export async function fetchWithTimeout(url: string, init: RequestInit = {}, timeoutMs: number = DEFAULT_TIMEOUT_MS): Promise<Response> {
  return fetch(url, { ...init, signal: AbortSignal.timeout(timeoutMs) });
}
