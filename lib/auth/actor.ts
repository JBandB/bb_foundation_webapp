/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wie er iets doet. Eén definitie, want dit type reist door de hele applicatie.
 *
 * Een eerdere versie had twee verschillende types met dezelfde naam `Actor`: één met alleen de rollen
 * en één met de volledige gebruiker. Dat compileert prima omdat de vorm van de eerste een subset is
 * van de tweede, en het valt dus pas op als iemand de verkeerde importeert en zich afvraagt waarom er
 * geen `id` op zit.
 */

import type { AppRole } from "./roles.generated";

/**
 * Het minimum dat `can()` nodig heeft. Losstaand type, zodat een test niet een volledige gebruiker
 * hoeft na te maken om één rechtenvraag te stellen.
 */
export interface RoleHolder {
  readonly roles: readonly AppRole[];
}

/**
 * De ingelogde gebruiker zoals de applicatie hem kent.
 *
 * Klein gehouden met opzet: dit object komt uit de sessiecookie, en die is geen cache voor
 * domeindata. Zie CLAUDE.md regel 4.
 */
export interface Actor extends RoleHolder {
  /** De id uit onze eigen users-tabel, niet het externe id van de inlogmodule. */
  readonly id: string;
  readonly organisationId: string;
  readonly name: string;
  readonly email: string;
  readonly initials: string;
  readonly roles: AppRole[];
  /**
   * Waarvandaan dit verzoek kwam, voor de audit log. Gezet in `currentActor` uit de headers van het
   * verzoek en verder nergens; een actor die in een script wordt gebouwd heeft ze niet. Ze doen niets
   * in autorisatie.
   */
  readonly ip?: string | undefined;
  readonly userAgent?: string | undefined;
}
