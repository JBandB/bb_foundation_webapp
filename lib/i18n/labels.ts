import type { Action } from "@/lib/auth/actions";
import { projectActionLabels } from "./domain/actions";
import { homeLabels } from "./domain/home";
import { templateLabels } from "./template";

/**
 * Alle teksten van de interface, in de taal uit project.config.json.
 *
 * Dit bestand is van het project. Het spreidt de teksten van het template uit (`templateLabels`) en
 * voegt daar per domein een bestand uit `lib/i18n/domain/` aan toe. Houd het klein: één regel per
 * domein. De teksten zelf staan in de domeinbestanden, en de huisregel `labels-size` weigert elk
 * labelbestand boven de zeshonderd regels (zie lib/i18n/domain/README.md).
 *
 * Gebruik: `labels.ui.edit`, `labels.home.title`. Teksten met een invulwaarde zijn functies, zoals
 * `labels.placeholder.version(APP_VERSION)`. Er is bewust geen `t("pad.naar.tekst")`: dat leest
 * slecht, is niet te typeren en levert bij een tikfout de sleutel op het scherm op.
 *
 * `actions` is de som van de rechten van het template en die van het project; `satisfies` zorgt dat
 * een nieuw recht in `lib/auth/actions.ts` zonder label niet compileert.
 */
export const labels = {
  ...templateLabels,
  ...homeLabels,
  actions: { ...templateLabels.actions, ...projectActionLabels } satisfies Record<Action, string>,
} as const;
