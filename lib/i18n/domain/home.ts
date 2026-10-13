import { PROJECT } from "@/lib/project/config.generated";

/**
 * De teksten van het beginscherm. Het eerste domeinbestand van dit project; de volgende komen
 * hiernaast, één per domein, en worden in `lib/i18n/labels.ts` samengesteld.
 *
 * Beide talen staan erin omdat dit bestand als seed meekomt uit het template; zodra het project een
 * taal heeft gekozen, mag de andere helft weg.
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export const homeLabels = {
  home:
    PROJECT.uiLanguage === "en"
      ? {
          navLabel: "Start",
          eyebrow: PROJECT.name,
          title: "Start",
          emptyTitle: "The first screen comes from the project plan",
          emptyBody: "This is the start screen of the project. Replace it with what the project plan describes as the first thing a user wants to see.",
        }
      : {
          navLabel: "Start",
          eyebrow: PROJECT.name,
          title: "Start",
          emptyTitle: "Het eerste scherm komt uit het projectplan",
          emptyBody: "Dit is het beginscherm van het project. Vervang het door wat het projectplan beschrijft als het eerste dat een gebruiker wil zien.",
        },
} as const;
