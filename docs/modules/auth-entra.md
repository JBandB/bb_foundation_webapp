<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Module auth-entra

Inloggen met het Microsoft-account van de organisatie. De standaard als er een Microsoft 365-tenant
is waar een beheerder een app mag registreren.

## Hoe het werkt

- De rollen komen uit de `roles`-claim van het token: de app roles die in de tenant zijn aangemaakt
  met exact de waarden uit `auth.roles` in `project.config.json`. Toekennen gebeurt in het
  Entra-beheercentrum; de tool toont alleen (Beheer, Toegang).
- Wie geen rol heeft, komt er niet in. De identiteit is de `oid` van het token, nooit `user.id`.
- `users.roles` is een cache van het laatste token, bijgewerkt bij elke login; adressering van mail
  (module messaging) leest die cache.

## Variabelen

`AUTH_MICROSOFT_ENTRA_ID_ID`, `AUTH_MICROSOFT_ENTRA_ID_SECRET` (verloopt), `AUTH_MICROSOFT_ENTRA_ID_ISSUER`
met een echte tenant-id erin (`common` werkt niet). Zie handleiding 05 en 11.

## Handwerk

De app-registratie, de redirect-URI's (lokaal en productie), de app roles, en de toewijzing van
rollen aan mensen. `pnpm entra:status` vergelijkt de rollen in de tenant met `APP_ROLES` (komt met
handleiding 05).

## Gaat niet samen met

`auth-password`. Eén inlogmodule per project. Rollen schrijven naar Entra vanuit de tool is de
gereserveerde module `access-graph`.
