/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm ai:test -- <model>`: één klein verzoek met de echte sleutel uit .env.local, om te zien of de
 * sleutel, de workspace en het model werken, en wat het kost in tokens. Gebruikt geen gegevens uit de
 * tool en schrijft niets in de database. Kost een fractie van een cent.
 */
import { aiKey, AI_KEY_ENV, apiErrorReason, askClaude } from "../lib/ai/client";
import { isModelId } from "../lib/ai/models";
import { outputSchema, validateProposal } from "../lib/ai/structure";
import { runScript } from "./lib/run";

const FIELDS = [{ key: "answer", label: "Het antwoord", kind: "choice", options: ["ja", "nee"] }] as const;

runScript(async () => {
  const model = process.argv.slice(2).find((argument) => !argument.startsWith("-"));
  if (model === undefined || !isModelId(model)) throw new Error("Gebruik: pnpm ai:test -- <model>, bijvoorbeeld pnpm ai:test -- claude-haiku-5-5");
  const apiKey = aiKey();
  if (apiKey === undefined) throw new Error(`${AI_KEY_ENV} ontbreekt in .env.local. Een Sensitive waarde komt niet mee met vercel env pull: zet hem zelf (docs/handleiding/24-claude-api.md).`);

  console.log(`Eén verzoek aan ${model}...`);
  const started = Date.now();
  try {
    const message = await askClaude(apiKey, {
      model,
      system: "Je test een koppeling. Antwoord in de vaste structuur.",
      message: "Werkt deze koppeling? Antwoord met ja.",
      effort: "low",
      maxTokens: 1000,
      schema: outputSchema(FIELDS),
    });
    const text = message.content.flatMap((block) => (block.type === "text" ? [block.text] : [])).join("");
    const parsed: unknown = JSON.parse(text);
    const valid = validateProposal(FIELDS, parsed);
    console.log(`Antwoord: ${text}`);
    console.log(`Structuur: ${valid.ok ? "klopt" : `klopt niet (${valid.problem})`}`);
    console.log(`Tokens: ${message.usage.input_tokens} in, ${message.usage.output_tokens} uit, in ${((Date.now() - started) / 1000).toFixed(1)} s.`);
    console.log("De sleutel, de workspace en het model werken. Het verzoek staat in de Console bij Usage.");
  } catch (error) {
    throw new Error(`Het verzoek lukte niet: ${apiErrorReason(error)}`);
  }
});
