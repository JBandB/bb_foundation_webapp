<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Outbox en berichtencatalogus

**Wanneer.** De tool wil iets melden aan een mens: een herinnering, een signaal, een uitnodiging.

**Het patroon.** Een bericht is een **soort** in de catalogus (`lib/messaging/catalogue.ts`): een
sleutel, een kanaal, de doelgroepen die kunnen en een standaard, en een drempel als dat past. De
beheerder zet per soort aan of uit, kiest de doelgroep en de drempel op Beheer, Berichten; de code
beslist dat nooit zelf. Versturen is `enqueueKind` met een onderwerp, een tekst in beperkte
markdown en een `about` voor de sleutel (met een datum als het morgen weer mag). De outbox zorgt
dat het één keer gebeurt, bundelt per ontvanger, en de ronde verstuurt direct na de handeling en
elke nacht als vangnet. Tekst van buiten gaat als citaat (`quoteUntrusted`), zodat een koppeling van
een vreemde nooit een knop wordt.

```ts
// lib/messaging/catalogue.ts (van het project)
export const PROJECT_KINDS: readonly MessageKind[] = [
  { key: "shift_unfilled", channel: "mail", audiences: ["role:coordinator", "admins"], defaultAudience: "role:coordinator", threshold: { unit: "days", min: 1, max: 30, fallback: 3 } },
];

// ergens in een taak of server action
const settings = await loadSettings(db, organisationId);
const days = settingFor(settings, "shift_unfilled").threshold ?? 3;
for (const shift of await unfilledWithin(db, organisationId, days)) {
  await enqueueKind(db, organisationId, "shift_unfilled", {
    about: `${shift.id}:${today}`,
    subject: labels.shifts.unfilledSubject(shift.date),
    bodyMd: labels.shifts.unfilledBody(shift),
  }, settings);
}
kickOutbox();
```

**Wat het kost.** Een soort toevoegen is drie regels catalogus en een stukje tekst in twee talen. De
beheerder moet weten dat Beheer, Berichten bestaat; het logboek daar laat zien wat er wel en niet
is verstuurd, met de reden.

**Waar in het template.** Module messaging: `lib/messaging/kinds.ts`, `enqueue-kind.ts`,
`outbox.ts`, `send.ts`, `settings.ts`, en het scherm `app/(app)/admin/messages/`.
