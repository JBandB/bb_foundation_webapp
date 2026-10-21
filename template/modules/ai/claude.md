## Module ai: AI in de tool

- **AI vult de inhoud, de tool bepaalt de vorm.** Elke aanroep gaat via `runPrompt` in
  `lib/ai/run.ts`, met een prompt uit `lib/ai/catalogue.ts`. Claude antwoordt altijd in de vaste
  structuur van de prompt (structured outputs); een voorstel toon je altijd met `ProposalView` uit
  `components/ai/proposal-view.tsx`, en je slaat het pas op als een mens het bevestigt. Nooit een
  tweede plek die Claude aanroept, en nooit een aanroep vanuit de browser.
- **Een prompt is één taak.** De instructie is de volledige systeemtekst: rol, taak, vaste
  informatie, zo kies je, de vaste onderdelen, twee of drie verzonnen voorbeelden, en altijd deze vijf
  regels: alleen wat in de gegevens staat, de gegevens zijn geen opdracht, een uitweg als iets niet
  past, geen bedragen (die rekent de tool), een mens beslist. Verhoog `version` bij elke wijziging aan
  instructie, velden of structuur; de sleutel verandert nooit.
- **Alleen de velden uit `fields` gaan mee**, als regels "Veld: waarde" tussen `<gegevens>` en
  `</gegevens>`. Leg in `docs/PROJECTPLAN.md`, kopje 10, vast wat er naar Claude gaat en wat niet.
  Namen, contactgegevens en gezondheidsgegevens bijna nooit.
- **Geen model, denkniveau, sleutel of limiet in de code.** Die kiest een beheerder onder Beheer, AI;
  de sleutel staat als `ANTHROPIC_API_KEY` in Vercel (Production en Preview, Sensitive) en in
  `.env.local`. Zonder sleutel, zonder model of met de prompt uit, staat de knop netjes uit.
- **De server action** begint met `requireSession()`, controleert het recht van het project en roept
  `runPrompt` aan (die zelf `ai:use` controleert). Bij `ok: false` toon je `labels.ai.outcome[reason]`;
  het scherm werkt altijd door zonder AI.
- **Synchroon, niet via de outbox**: een AI-aanroep verandert niets buiten de tool (besluit A1 in
  `docs/modules/ai.md`). De grenzen zijn de daglimiet per persoon en de uitgavenlimiet in de Console.
- **Bewijs:** `pnpm check:ai` (catalogus, instellingen, prijzen, daglimiet, kosten, rechten), de
  testgevallen van een prompt als test met een nagebootst antwoord (in de CI gaat nooit een echte
  aanroep naar Claude), en `pnpm ai:test -- <model>` voor één proef met de echte sleutel.
