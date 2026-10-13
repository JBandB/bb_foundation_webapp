/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { PROJECT } from "@/lib/project/config.generated";
import { graphTransport } from "./graph";
import { smtpTransport } from "./smtp";
import type { MailTransport } from "./types";

/** Het ene transport van dit project, gekozen in project.config.json. */
export const mailTransport: MailTransport = PROJECT.messaging.transport === "graph" ? graphTransport : smtpTransport;

export type { MailMessage, MailTransport } from "./types";
