/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { toggleTheme } from "@/app/(app)/actions";
import { SwitchSubmit } from "@/components/ui/switch";
import type { Theme } from "@/lib/domain/preferences";
import { labels } from "@/lib/i18n/labels";

/**
 * Licht of donker, linksonder in de rail.
 *
 * Een schuifje, en dus komt de stand als prop binnen: een schuifje moet `aria-checked` kunnen zetten
 * en dat kan een stylesheet niet. De query kost niets extra's, want `themeForRequest` is per verzoek
 * gedeeld met de root-layout die de class op `<html>` zet.
 *
 * Het label beweegt niet mee. "Donker" is wat het schuifje regelt; wat de stand is, laat het schuifje
 * zelf zien.
 */
export function ThemeToggle({ theme }: { theme: Theme }) {
  return (
    <form action={toggleTheme}>
      <SwitchSubmit checked={theme === "dark"} tone="rail" label={labels.nav.themeDark} title={labels.nav.themeHint} />
    </form>
  );
}
