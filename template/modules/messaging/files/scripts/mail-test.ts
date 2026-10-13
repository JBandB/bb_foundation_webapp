/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm mail:test -- iemand@domein.nl`: eerst de handdruk met het transport, dan één proefmail naar
 * het opgegeven adres, langs het echte transport en buiten de outbox om. Voor het inrichten
 * (handleiding 20 of 20b); niet voor dagelijks gebruik.
 */
import { mailHtml } from "../lib/messaging/mail-html";
import { mailTransport } from "../lib/messaging/transport";
import { PROJECT } from "../lib/project/config.generated";
import { runScript } from "./lib/run";

runScript(async () => {
  const toEmail = process.argv.slice(2).find((argument) => !argument.startsWith("-"));
  if (toEmail === undefined || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(toEmail)) {
    throw new Error("Geef een adres op: pnpm mail:test -- iemand@domein.nl");
  }
  if (!mailTransport.configured()) {
    throw new Error(`${mailTransport.name} is niet ingericht. Ontbreekt: ${mailTransport.missing().join(", ")}.`);
  }

  console.log(`Transport: ${mailTransport.name}`);
  console.log(`Handdruk: ${await mailTransport.verify()}`);

  const bodyMd = [`Dit is een proefmail van ${PROJECT.name}.`, "", "Komt deze aan en ziet hij er goed uit, dan is het transport ingericht.", "", `https://${PROJECT.slug}.invalid/`].join("\n");
  await mailTransport.send({
    toEmail,
    subject: `Proefmail van ${PROJECT.name}`,
    bodyText: bodyMd,
    bodyHtml: mailHtml(bodyMd, { buttonLabel: "Openen", footer: `${PROJECT.name}, ${PROJECT.organisationName}.` }),
  });
  console.log(`Verstuurd naar ${toEmail}. Kijk ook in de spammap.`);
});
