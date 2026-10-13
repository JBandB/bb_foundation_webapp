/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Meerdere berichten voor dezelfde ontvanger in één ronde worden één mail: vijf losse mails om
 * negen uur 's ochtends leest niemand, één mail met vijf koppen wel. Puur, zodat het te testen is.
 */

export interface BundleInput {
  readonly id: string;
  readonly toEmail: string;
  readonly subject: string;
  readonly bodyMd: string;
}

export interface MailBundle {
  readonly toEmail: string;
  readonly subject: string;
  readonly bodyMd: string;
  readonly ids: readonly string[];
}

export function bundleMail(messages: readonly BundleInput[], subjectFor: (count: number) => string): MailBundle[] {
  const byEmail = new Map<string, BundleInput[]>();
  for (const message of messages) {
    const list = byEmail.get(message.toEmail);
    if (list === undefined) byEmail.set(message.toEmail, [message]);
    else list.push(message);
  }

  const bundles: MailBundle[] = [];
  for (const [toEmail, list] of byEmail) {
    const single = list.length === 1 ? list[0] : undefined;
    if (single !== undefined) {
      bundles.push({ toEmail, subject: single.subject, bodyMd: single.bodyMd, ids: [single.id] });
      continue;
    }
    bundles.push({
      toEmail,
      subject: subjectFor(list.length),
      bodyMd: list.map((message) => `**${message.subject}**\n\n${message.bodyMd.trim()}`).join("\n\n"),
      ids: list.map((message) => message.id),
    });
  }
  return bundles;
}
