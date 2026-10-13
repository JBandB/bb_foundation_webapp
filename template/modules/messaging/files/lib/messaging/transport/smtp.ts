/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Mail via SMTP met nodemailer: het transport voor een project zonder Microsoft-tenant. Elke
 * aanbieder die SMTP met een gebruikersnaam en wachtwoord (of app-wachtwoord) aanbiedt werkt; de
 * afzender hoort bij een domein met SPF en DKIM, anders belandt de mail in de spam. Zie
 * docs/handleiding/20b-smtp.md.
 */
import { createTransport, type Transporter } from "nodemailer";
import type { MailMessage, MailTransport } from "./types";

const REQUIRED = ["SMTP_HOST", "SMTP_USER", "SMTP_PASSWORD", "SMTP_FROM"] as const;

interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
  readonly from: string;
}

function readConfig(): SmtpConfig | undefined {
  if (missingConfig().length > 0) return undefined;
  const port = Number(process.env.SMTP_PORT ?? "587");
  return {
    host: process.env.SMTP_HOST ?? "",
    port: Number.isInteger(port) && port > 0 ? port : 587,
    user: process.env.SMTP_USER ?? "",
    password: process.env.SMTP_PASSWORD ?? "",
    from: process.env.SMTP_FROM ?? "",
  };
}

function missingConfig(): string[] {
  return REQUIRED.filter((name) => (process.env[name] ?? "").trim() === "");
}

let cached: { readonly key: string; readonly transporter: Transporter } | undefined;

function transporter(config: SmtpConfig): Transporter {
  const key = `${config.host}:${config.port}:${config.user}`;
  if (cached?.key === key) return cached.transporter;
  const created = createTransport({
    host: config.host,
    port: config.port,
    /* 465 is SMTPS; 587 en 25 beginnen onversleuteld en gaan met STARTTLS verder. */
    secure: config.port === 465,
    auth: { user: config.user, pass: config.password },
    connectionTimeout: 20_000,
    socketTimeout: 20_000,
  });
  cached = { key, transporter: created };
  return created;
}

function notConfigured(): Error {
  return new Error(`SMTP is niet ingericht. Ontbreekt: ${missingConfig().join(", ")}. Zie docs/handleiding/20b-smtp.md.`);
}

export const smtpTransport: MailTransport = {
  name: "SMTP",
  configured: () => readConfig() !== undefined,
  missing: missingConfig,
  send: async (message) => {
    const config = readConfig();
    if (config === undefined) throw notConfigured();
    await transporter(config).sendMail({ from: config.from, to: message.toEmail, subject: message.subject, text: message.bodyText, html: message.bodyHtml });
  },
  verify: async () => {
    const config = readConfig();
    if (config === undefined) throw notConfigured();
    await transporter(config).verify();
    return `Verbinding met ${config.host}:${config.port} gelukt als ${config.user}.`;
  },
};
