/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */

/** De twee talen van de interface. De documentatie is altijd Nederlands. */
export type UiLanguage = "nl" | "en";

/** Het logo: een tekstmerk uit de projectnaam, of een afbeelding uit `public/brand/`. */
export type ProjectLogo =
  | { readonly kind: "wordmark"; readonly path: null; readonly darkPath: null }
  | { readonly kind: "image"; readonly path: string; readonly darkPath: string | null };

/** Een account dat de dev-login aanbiedt, alleen lokaal. */
export interface DevUser {
  readonly email: string;
  readonly displayName: string;
  readonly roles: readonly string[];
}

/**
 * Wat de applicatie van `project.config.json` weet. De generator schrijft `lib/project/config.generated.ts`
 * met precies deze velden; niets hiervan is geheim en alles mag in de browserbundel belanden.
 */
export interface ProjectInfo {
  readonly name: string;
  readonly shortName: string;
  readonly slug: string;
  readonly description: string;
  readonly organisationName: string;
  readonly uiLanguage: UiLanguage;
  /** Afgeleid van de taal: nl-NL of en-GB. Voor getallen, datums en sorteren. */
  readonly locale: string;
  readonly timezone: string;
  readonly currency: string;
  /** De afzender in de audit log voor crons en taken. */
  readonly systemEmail: string;
  readonly productionUrl: string | null;
  /** Waar de voorpagina heen stuurt na het inloggen. */
  readonly homePath: string;
  /** Of de donkere modus bestaat (`auto`: elke gebruiker kiest) of uit staat. */
  readonly darkMode: "auto" | "off";
  /** De inlogmodule: bepaalt waar de rollen vandaan komen (token bij entra, database bij password). */
  readonly authProvider: "entra" | "password";
  readonly logo: ProjectLogo;
  readonly devUsers: readonly DevUser[];
  /** De toegepaste modules, zonder core (die is er altijd). */
  readonly modules: readonly string[];
  readonly messaging: { readonly transport: "smtp" | "graph"; readonly teams: boolean };
  /** De wachtwoordlogin: voor wie tweestapsverificatie verplicht is. Alleen van belang bij provider password. */
  readonly password: { readonly mfaRequiredFor: "admins" | "everyone" | "nobody" };
}
