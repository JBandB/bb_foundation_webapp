/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Een mail als HTML, uit dezelfde beperkte markdown als de schermen (vet, cursief, lijsten, één
 * koppeling op een regel wordt een knop). Tabellen en inline-stijlen, want mailclients kennen geen
 * stylesheet; de kleuren komen uit de merkkleuren van het project, het merk is tekst en geen
 * plaatje (een geblokkeerde afbeelding is een lege kop).
 */
import { brandColors } from "@/lib/brand/tokens";
import { parseRich, type RichSpan } from "@/lib/domain/rich-text";
import { PROJECT } from "@/lib/project/config.generated";

export interface MailShell {
  /** De tekst op de knop als een alinea alleen uit één https-koppeling bestaat. */
  readonly buttonLabel: string;
  readonly footer: string;
}

export function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function spansToHtml(spans: readonly RichSpan[]): string {
  return spans
    .map((span) => {
      const text = escapeHtml(span.text).replace(/\n/g, "<br />");
      if (span.bold === true) return `<strong>${text}</strong>`;
      if (span.italic === true) return `<em>${text}</em>`;
      return text;
    })
    .join("");
}

function soleLink(spans: readonly RichSpan[]): string | undefined {
  if (spans.length !== 1) return undefined;
  const text = (spans[0]?.text ?? "").trim();
  return /^https:\/\/[^\s<>"']+$/.test(text) ? text : undefined;
}

const FONT = "font-family:Segoe UI,Helvetica,Arial,sans-serif;font-size:14px;line-height:1.55";

export function mailHtml(bodyMd: string, shell: MailShell): string {
  const parts: string[] = [];
  for (const block of parseRich(bodyMd)) {
    if (block.kind === "list") {
      const tag = block.ordered ? "ol" : "ul";
      const items = block.items.map((item) => `<li style="margin:0 0 6px 0">${spansToHtml(item)}</li>`).join("");
      parts.push(`<${tag} style="${FONT};color:${brandColors.ink};margin:0 0 14px 0;padding-left:20px">${items}</${tag}>`);
      continue;
    }
    const link = soleLink(block.spans);
    if (link !== undefined) {
      parts.push(
        [
          `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:0 0 18px 0">`,
          `<tr><td style="background:${brandColors.primary};border-radius:6px">`,
          `<a href="${escapeHtml(link)}" style="${FONT};display:inline-block;padding:11px 20px;color:${brandColors.paper};text-decoration:none;font-weight:600">${escapeHtml(shell.buttonLabel)}</a>`,
          `</td></tr></table>`,
        ].join(""),
      );
      continue;
    }
    parts.push(`<p style="${FONT};color:${brandColors.ink};margin:0 0 14px 0">${spansToHtml(block.spans)}</p>`);
  }

  return [
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${brandColors.surface};padding:24px 12px">`,
    `<tr><td align="center">`,
    `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${brandColors.paper};border:1px solid ${brandColors.line};border-radius:10px">`,
    `<tr><td style="padding:22px 26px 0 26px">`,
    `<div style="${FONT};font-size:17px;font-weight:700;color:${brandColors.ink};letter-spacing:-0.01em">${escapeHtml(PROJECT.name)}</div>`,
    `<div style="${FONT};font-size:11px;color:${brandColors.soft};margin-top:2px">${escapeHtml(PROJECT.organisationName)}</div>`,
    `<div style="height:3px;width:34px;background:${brandColors.accent};margin:14px 0 18px 0"></div>`,
    `</td></tr>`,
    `<tr><td style="padding:0 26px 8px 26px">${parts.join("")}</td></tr>`,
    `</table>`,
    `<div style="${FONT};font-size:11px;color:${brandColors.soft};max-width:560px;margin:14px auto 0 auto">${escapeHtml(shell.footer)}</div>`,
    `</td></tr></table>`,
  ].join("");
}

/**
 * Tekst van buiten (een melding van iemand die niet is ingelogd) als citaat, zodat een koppeling
 * erin nooit een knop wordt en de lezer ziet dat het niet onze woorden zijn.
 */
export function quoteUntrusted(text: string): string {
  return text
    .split("\n")
    .map((line) => (line.trim() === "" ? ">" : `> ${line}`))
    .join("\n");
}

/**
 * Een kort veld van buiten (een naam, een onderwerp) op één regel, voor midden in een zin.
 *
 * `quoteUntrusted` beschermt een bericht, maar niet de naam die ervoor staat. Een naam met witregels
 * en een adres ertussen werd zo een eigen alinea met alleen dat adres, en dus een knop in onze mail
 * naar elke site (in een eerder project gevonden bij een audit). Op één regel staat het adres altijd
 * tussen andere woorden, en dan is het tekst. Stuurtekens en de Unicode-regelscheiders gaan er ook uit.
 */
export function oneLineUntrusted(text: string): string {
  return text
    .replace(/[\u0000-\u001f\u007f-\u009f\u2028\u2029]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
