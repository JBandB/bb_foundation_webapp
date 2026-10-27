/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het hulpformulier op het inlogscherm: wie er niet in komt, laat een naam, een adres en een
 * omschrijving achter, en een beheerder krijgt dat als mail. Het enige formulier dat zonder sessie
 * schrijft, dus met drie remmen: een honingpot (een verborgen veld dat een mens leeg laat), een
 * grens per afzenderadres via rate_limits, en een plafond per uur op het geheel. De grens per adres
 * komt eerst en doet het werk; het plafond staat er alleen tegen veel adressen tegelijk, en ligt
 * hoog genoeg dat een paar bezoekers het enige hulpkanaal niet dichthouden.
 *
 * De tekst van buiten gaat als citaat de mail in, zodat een koppeling erin nooit een knop wordt, en
 * de naam (die midden in een zin staat) op één regel, om dezelfde reden.
 */
import { and, count, eq, gte, sql } from "drizzle-orm";
import type { DbOrTransaction } from "@/lib/db/client";
import { organisations, outbox } from "@/lib/db/schema";
import { consumeRateLimit } from "@/lib/domain/rate-limit";
import { labels } from "@/lib/i18n/labels";
import { enqueueKind } from "./enqueue-kind";
import { oneLineUntrusted, quoteUntrusted } from "./mail-html";

export const LOGIN_HELP_LIMITS = { name: 200, email: 320, message: 2000 } as const;
export const LOGIN_HELP_MAX_PER_HOUR = 50;
export const LOGIN_HELP_MAX_PER_ADDRESS = 2;

export interface LoginHelpInput {
  readonly name: unknown;
  readonly email: unknown;
  readonly message: unknown;
  readonly honeypot: unknown;
  /** Het IP-adres van de aanvrager, als het verzoek er een heeft. */
  readonly address?: string | undefined;
}

export type LoginHelpResult = { readonly ok: true } | { readonly ok: false; readonly errors: Readonly<Record<string, string>> };

export async function submitLoginHelp(db: DbOrTransaction, input: LoginHelpInput): Promise<LoginHelpResult> {
  const texts = labels.messaging.loginHelpErrors;
  /* Een gevuld verborgen veld is een robot: zeg dat het lukte en doe niets. */
  if (typeof input.honeypot === "string" && input.honeypot.trim() !== "") return { ok: true };

  const name = typeof input.name === "string" ? oneLineUntrusted(input.name).slice(0, LOGIN_HELP_LIMITS.name) : "";
  const email = typeof input.email === "string" ? input.email.trim().slice(0, LOGIN_HELP_LIMITS.email) : "";
  const message = typeof input.message === "string" ? input.message.trim() : "";

  const errors: Record<string, string> = {};
  if (name === "") errors.name = texts.nameRequired;
  if (email === "" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) errors.email = texts.emailRequired;
  if (message === "") errors.message = texts.messageRequired;
  else if (message.length > LOGIN_HELP_LIMITS.message) errors.message = texts.tooLong;
  if (Object.keys(errors).length > 0) return { ok: false, errors };

  const organisation = (await db.select({ id: organisations.id }).from(organisations).limit(1))[0];
  if (organisation === undefined) return { ok: false, errors: { message: texts.noRecipients } };

  /* Eerst per adres, zodat één bezoeker de plekken van het plafond niet zelf vult. */
  if (input.address !== undefined && input.address !== "") {
    const gate = await consumeRateLimit(db, { organisationId: organisation.id, key: `login-help:${input.address}`, limit: LOGIN_HELP_MAX_PER_ADDRESS, windowMinutes: 60 });
    if (!gate.ok) return { ok: false, errors: { message: texts.tooMany } };
  }

  const recent = (
    await db
      .select({ n: count() })
      .from(outbox)
      .where(and(eq(outbox.organisationId, organisation.id), eq(outbox.kind, "login_help"), gte(outbox.createdAt, sql`now() - interval '1 hour'`)))
  )[0];
  if (Number(recent?.n ?? 0) >= LOGIN_HELP_MAX_PER_HOUR) return { ok: false, errors: { message: texts.tooMany } };

  const result = await enqueueKind(db, organisation.id, "login_help", {
    about: crypto.randomUUID(),
    subject: labels.messaging.loginHelpSubject(name),
    bodyMd: labels.messaging.loginHelpBody(name, email, quoteUntrusted(message)),
  });
  if (!result.enabled || result.recipients === 0) return { ok: false, errors: { message: texts.noRecipients } };
  return { ok: true };
}
