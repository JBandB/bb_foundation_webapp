/* template-owned (module auth-entra). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wie er inlogt, volgens Entra: het object-id en de `sub`. Puur, zodat het los te testen is.
 *
 * ---
 *
 * **`user.id` is niet van Entra.** Auth.js zet het bij elke login op een nieuwe willekeurige UUID
 * (`getUserAndAccount` in `@auth/core`: "the user's id is intentionally not set based on the profile
 * id"). De `sub` staat op `account.providerAccountId`. Een eerder project las `user.id` als de `sub`
 * en legde bij elke login een wegwerp-GUID vast; een uitgenodigde gast kwam daardoor na zijn eerste
 * login nooit meer binnen.
 *
 * **Het object-id is de sleutel.** Dat is een GUID die Graph kent, stabiel per persoon in de tenant.
 * De `sub` is per applicatie versleuteld en dient alleen nog om een account van vóór deze afspraak te
 * herkennen.
 */

export interface EntraIdentity {
  /** Het object-id (`oid`), of de `sub` als het token er geen heeft. */
  readonly objectId: string;
  /** De `sub`, zoals Auth.js hem als `providerAccountId` bewaart. */
  readonly subject: string;
}

export function entraIdentity(user: { oid?: string | undefined }, account: { providerAccountId?: string | undefined }): EntraIdentity {
  const subject = (account.providerAccountId ?? "").trim();
  const oid = (user.oid ?? "").trim();
  return { objectId: oid !== "" ? oid : subject, subject };
}
