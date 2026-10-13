## Module auth-password: eigen accounts

- **Rollen komen uit `users.roles`**, gezet door een beheerder op Beheer, Accounts, en gelezen bij
  elk verzoek (`currentActor`). Een wijziging geldt meteen. Nooit uit een cookie of de request body.
- **Een account ontstaat door een uitnodiging**: de beheerder maakt de persoon aan met rollen, de
  persoon krijgt een eenmalige koppeling per mail (zeven dagen geldig) en kiest daar een wachtwoord.
  Er is geen zelfregistratie en geen standaardwachtwoord.
- **Wachtwoorden: scrypt met eigen zout** (`lib/auth/password/hash.ts`), minstens twaalf tekens, niet
  het eigen adres erin. Nooit een wachtwoord loggen, mailen of in een foutmelding zetten.
- **Tweestapsverificatie (TOTP)** is verplicht voor de rollen die `auth.password.mfaRequiredFor` in
  project.config.json noemt (standaard: beheerders). Wie het nog niet heeft, stelt het in bij de
  eerste login via een eenmalige koppeling; het geheim staat versleuteld met een sleutel uit
  AUTH_SECRET (`secret-box.ts`). Draait AUTH_SECRET, dan stelt iedereen het opnieuw in.
- **Vergrendeling**: vijf mislukte pogingen op een account is een kwartier dicht, vijf vanaf één
  adres ook. Eén foutmelding voor onbekend adres, fout wachtwoord en vergrendeld, zodat het
  inlogscherm niet verraadt welke adressen bestaan.
- **Eenmalige tokens** (`lib/auth/password/tokens.ts`): alleen de sha256 staat in de database, innemen
  is één statement, en een nieuwe maakt de oude van dezelfde soort ongeldig.
- **Elke mutatie op accounts** gaat door `assertCan(actor, "admin:access")` en laat een auditregel
  achter; mails gaan via `enqueueKind` (soorten `account_invite` en `password_reset`).
- **Bewijs:** `pnpm check:auth-password` en e2e `09-password.spec.ts`. Lees ook handleiding 05b: Entra
  heeft de voorkeur als er een tenant is; dit is de tweede deur.
