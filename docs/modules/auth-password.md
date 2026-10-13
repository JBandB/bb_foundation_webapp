<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Module auth-password

Eigen accounts met wachtwoord en tweestapsverificatie, voor een project zonder Microsoft-tenant.
Vereist `messaging` (voor uitnodigingen en herstelkoppelingen); gaat niet samen met `auth-entra`.

## Hoe het werkt

- **Uitnodigen door een beheerder** op Beheer, Accounts: naam, adres, rollen. De persoon krijgt een
  koppeling per mail (zeven dagen geldig) en kiest daar een wachtwoord. Geen zelfregistratie.
- **Rollen in `users.roles`**, gezet door een beheerder, gelezen bij elk verzoek. Een wijziging geldt
  meteen; de laatste beheerder kan zijn rol niet verliezen en zichzelf niet deactiveren.
- **Wachtwoorden** met scrypt en een eigen zout; minstens twaalf tekens, niet het eigen adres.
- **Tweestapsverificatie** (TOTP met een authenticator-app), verplicht voor de rollen in
  `auth.password.mfaRequiredFor` (standaard beheerders). Wie het nog niet heeft, stelt het in bij
  de eerste login via een koppeling per mail. Het geheim staat versleuteld met een sleutel uit
  `AUTH_SECRET`.
- **Vergrendeling** na vijf mislukte pogingen op een account of vanaf één adres, een kwartier lang.
  Eén foutmelding voor alles.
- **Mijn account** in de rail: wachtwoord wijzigen, tweestapsverificatie aan of uit.

## Schermen

`/sign-in` (met het codeveld als dat nodig is), `/sign-in/reset`, `/sign-in/reset/<token>`,
`/sign-in/invite/<token>`, `/sign-in/mfa/<token>`, `/account/security`, `/admin/accounts`.

## Handwerk

De eerste beheerder: `pnpm invite -- <adres> "<naam>" <beheerdersrol>` drukt de koppeling af.
Daarna gaat alles via Beheer, Accounts. Zie handleiding 05b voor de keuzes en wat te doen bij een
vermoeden van misbruik.

## Bewijs

`pnpm check:auth-password` (tokens, vergrendeling, uitnodigen, tweestapsverificatie met een echte
code) en e2e `09-password.spec.ts`.
