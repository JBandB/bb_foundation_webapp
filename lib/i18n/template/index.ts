/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { PROJECT } from "@/lib/project/config.generated";
import { en, type TemplateLabels as CoreLabels } from "./en";
import { moduleLabels } from "./modules.generated";
import { nl } from "./nl";

const core: CoreLabels = PROJECT.uiLanguage === "en" ? en : nl;

/**
 * De teksten van de kern plus die van de toegepaste modules, elk onder de naam van de module
 * (`templateLabels.jobs.title`). Welke modules dat zijn, schrijft `pnpm template:generate` in
 * `modules.generated.ts`; het project zet hier zijn eigen teksten naast in `lib/i18n/labels.ts`.
 */
export const templateLabels = { ...core, ...moduleLabels };
export type TemplateLabels = typeof templateLabels;
