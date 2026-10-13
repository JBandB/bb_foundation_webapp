<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Rollen uit de inlogmodule

**Wanneer.** Altijd, bij elke vraag "mag deze persoon dit".

**Het patroon.** Een rol komt uit de bron van de inlogmodule en nergens anders: bij Entra uit de
`roles`-claim van het token (toegekend in de tenant), bij de wachtwoordlogin uit `users.roles`
(gezet door een beheerder in de tool). Nooit uit een cookie, nooit uit de request body, nooit uit
een verborgen veld. Onbekende rollen vallen weg (`parseRoles`); wie geen rol heeft, mag niets. Een
recht is een regel in de matrix (`lib/auth/matrix.ts`), en `can(actor, "recht")` is de enige vraag
die code stelt. Autorisatie zit in de query (het filter op organisatie en op wat deze rol mag zien),
niet in de UI: een knop verbergen is geen beveiliging.

```ts
// lib/auth/actions.ts (van het project)
export const PROJECT_ACTIONS = ["shifts:read", "shifts:write"] as const;

// lib/auth/matrix.ts (van het project): elke rol een regel, anders compileert het niet
export const MATRIX: Readonly<Record<AppRole, readonly Action[]>> = {
  admin: [...ACTIONS],
  coordinator: ["shifts:read", "shifts:write"],
  volunteer: ["shifts:read"],
};

// een server action
export async function saveShift(_previous: FormState, form: FormData): Promise<FormState> {
  const actor = await requireActor();
  assertCan(actor, "shifts:write");
  ...
}
```

**Wat het kost.** Een rol toevoegen is een regel in `project.config.json` (en bij Entra een app role
in de tenant) plus een regel in de matrix. `pnpm template:generate` schrijft `APP_ROLES` opnieuw en
de compiler wijst elke plek aan die de nieuwe rol mist.

**Waar in het template.** `lib/auth/roles.generated.ts`, `can.ts`, `matrix.ts`, `session.ts`
(`currentActor` leest bij de wachtwoordlogin de rollen uit de database), en `can.test.ts` bewijst
dat een lege rolset niets mag en een beheerder alles.
