## Inloggen met Microsoft Entra (module auth-entra)

- **Rollen komen uit de `roles`-claim van het token** en nergens anders. Toekennen gebeurt in het
  Entra-beheercentrum, als app roles op de enterprise application; de tool toont alleen wie wat heeft.
  Een rol die niet in `project.config.json` staat, valt weg bij het inlezen.
- **De identiteit van een gebruiker is de `oid` uit het profiel**, met de `sub` van het account als
  terugval. Het `user.id` dat Auth.js aanlevert is per login een willekeurige UUID en wordt nooit
  opgeslagen of vergeleken.
- **Een nieuwe rol** staat eerst in `project.config.json`, dan in de tenant als app role met exact
  dezelfde waarde. De twee lijsten horen gelijk te zijn.
