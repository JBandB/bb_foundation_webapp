<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Rollen schrijven naar Entra

**Wanneer.** Nog niet: dit is het patroon voor de gereserveerde module `access-graph`. Met de module
auth-entra is Beheer, Toegang alleen-lezen en kent een beheerder rollen toe in het
Entra-beheercentrum (handleiding 11).

**Het patroon.** Een rol toekennen in Entra is een **app role assignment** op de service principal
van de app, via Microsoft Graph met het applicatierecht `AppRoleAssignment.ReadWrite.All` (admin
consent). Dat is een schrijfactie naar buiten, dus een taak in de wachtrij met een
idempotentiesleutel (`entra:assign:<userId>:<role>`), een handler die eerst de bestaande
assignments leest (een dubbele toekenning geeft een 400), en een auditregel. De waarheid blijft het
token: na een toekenning geldt de rol pas bij de volgende login van die persoon, en het scherm zegt
dat. Intrekken is het verwijderen van de assignment op dezelfde manier. Nooit rollen schrijven
vanuit een server action rechtstreeks.

```ts
// lib/jobs/handlers.ts (toekomstig, module access-graph)
"entra:assign_role": async (job) => {
  const { principalId, appRoleId, resourceId } = job.request as AssignRequest;
  const existing = await graphRequest(`/users/${principalId}/appRoleAssignments`);
  const assignments = (existing.body as { value?: { appRoleId: string; resourceId: string }[] }).value ?? [];
  if (assignments.some((assignment) => assignment.appRoleId === appRoleId && assignment.resourceId === resourceId)) return done({ already: true });
  const response = await graphRequest(`/users/${principalId}/appRoleAssignments`, { method: "POST", body: { principalId, resourceId, appRoleId } });
  if (response.status >= 400) throw new Error(`Graph gaf status ${response.status}`);
  return done(response.body);
},
```

**Wat het kost.** Een extra recht op de app-registratie dat ver gaat (alle app role assignments in de
tenant), en daarom een besluit in SPEC met de prijs erbij. De beheerder heeft met de console al een
werkende weg; de module koopt gemak, geen mogelijkheid.

**Waar in het template.** Niets; `lib/messaging/transport/graph.ts` heeft het tokenpad en de
herkansing bij 401 en 403 die de module kan hergebruiken.
