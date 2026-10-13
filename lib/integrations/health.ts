/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De stand van een koppeling, voor Beheer, Systeem. Elke module met iets van buiten (mail, opslag,
 * een API) meldt zich aan in het register met één functie die zegt of het werkt, zonder iets te
 * veranderen en zonder lang te wachten.
 */

export type HealthStatus = "ok" | "warning" | "error" | "off";

export interface HealthReport {
  readonly status: HealthStatus;
  /** Eén zin in gewone taal: wat er is gecontroleerd en wat eruit kwam. */
  readonly detail: string;
}

export interface HealthProvider {
  /** De naam van de koppeling zoals hij op het scherm staat. */
  readonly name: string;
  /** Mag de database lezen; raakt niets van buiten langer dan een paar seconden. */
  readonly check: () => Promise<HealthReport>;
}

/** Een koppeling die bewust uitstaat, bijvoorbeeld omdat de variabelen ontbreken. */
export function off(detail: string): HealthReport {
  return { status: "off", detail };
}

/** Een controle met een tijdslimiet, zodat één trage dienst het scherm niet ophoudt. */
export async function withTimeout(check: () => Promise<HealthReport>, ms = 4000): Promise<HealthReport> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<HealthReport>((resolve) => {
    timer = setTimeout(() => resolve({ status: "error", detail: `Geen antwoord binnen ${ms / 1000} seconden.` }), ms);
  });
  try {
    return await Promise.race([check(), timeout]);
  } catch (error) {
    return { status: "error", detail: error instanceof Error ? error.message : String(error) };
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}
