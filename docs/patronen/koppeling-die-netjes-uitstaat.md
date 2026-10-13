<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Een koppeling die netjes uitstaat

**Wanneer.** Elke koppeling naar buiten (mail, opslag, een API) die niet vanaf dag één is ingericht,
of die in een preview of lokaal ontbreekt.

**Het patroon.** De koppeling leest zijn variabelen op het moment van gebruik, niet bij het
opstarten. Ontbreekt er een, dan is de koppeling **uit**: `configured()` is false, `missing()` noemt
de namen, en de code die haar nodig heeft doet niets en zegt dat, zonder te gooien en zonder de
handeling van de gebruiker te blokkeren. Het werk blijft staan (in de outbox, in de wachtrij) tot de
variabelen er zijn. Beheer, Systeem toont de stand via een `HealthProvider`; een pagina openen doet
nooit een aanroep naar buiten.

```ts
const REQUIRED = ["CRM_URL", "CRM_TOKEN"] as const;

export function crmConfigured(): boolean {
  return crmMissing().length === 0;
}
export function crmMissing(): string[] {
  return REQUIRED.filter((name) => (process.env[name] ?? "").trim() === "");
}

export const crmHealth: HealthProvider = {
  name: labels.crm.healthName,
  check: async () => (crmConfigured() ? { status: "ok", detail: labels.crm.healthOk } : { status: "warning", detail: labels.crm.healthMissing(crmMissing()) }),
};

// in de handler
if (!crmConfigured()) return waiting(`CRM is niet ingericht: ${crmMissing().join(", ")}`);
```

**Wat het kost.** Twee functies en een regel in Beheer, Systeem. Een koppeling die bij het opstarten
gooit, legt in een preview de hele app plat voor een variabele die daar bewust niet staat; dat is in
een eerder project meer dan eens gebeurd.

**Waar in het template.** `lib/integrations/health.ts` (het contract en `withTimeout`), de
transporten van messaging (`mailTransport.configured()`), `lib/files/blob.ts`, en het register
`healthProviders` in het manifest.
