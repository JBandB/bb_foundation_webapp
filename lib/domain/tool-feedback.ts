/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De grenzen en de controle van een melding over de tool. Puur, zodat het los te testen is; de
 * server action in app/(app)/tool-feedback-actions.ts roept dit aan en schrijft daarna.
 */

export const FEEDBACK_LIMITS = { title: 120, body: 4000, path: 300 } as const;

/** Hoeveel meldingen één persoon per uur kan insturen voordat het slot dichtgaat. Ruim: een mens haalt dit nooit, een script wel. */
export const FEEDBACK_RATE = { limit: 20, windowMinutes: 60 } as const;

export interface FeedbackInput {
  readonly title: string;
  readonly body: string;
  readonly path: string;
}

export type FeedbackCheck = { readonly ok: true; readonly value: FeedbackInput } | { readonly ok: false; readonly errors: Readonly<Record<string, string>> };

export function checkFeedback(
  raw: { title: unknown; body: unknown; path: unknown },
  texts: { required: string; tooLong: (max: number) => string },
): FeedbackCheck {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const body = typeof raw.body === "string" ? raw.body.trim() : "";
  /* Het pad is context en geen invoer van de gebruiker; wat niet op een pad lijkt, wordt de wortel. */
  const path = typeof raw.path === "string" && raw.path.startsWith("/") ? raw.path.slice(0, FEEDBACK_LIMITS.path) : "/";

  const errors: Record<string, string> = {};
  if (title === "") errors.title = texts.required;
  else if (title.length > FEEDBACK_LIMITS.title) errors.title = texts.tooLong(FEEDBACK_LIMITS.title);
  if (body === "") errors.body = texts.required;
  else if (body.length > FEEDBACK_LIMITS.body) errors.body = texts.tooLong(FEEDBACK_LIMITS.body);

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return { ok: true, value: { title, body, path } };
}
