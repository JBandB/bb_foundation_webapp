/* template-owned (module auth-entra). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Microsoft Entra ID.
 *
 * De provider leest zijn drie waarden zelf uit de omgeving: AUTH_MICROSOFT_ENTRA_ID_ID, _SECRET en
 * _ISSUER. Die laatste bepaalt de tenant en is dus wat de login beperkt tot de organisatie. Ontbreekt
 * hij, dan valt de provider terug op `/common/` en mag ieder Microsoft-account inloggen. Daarom staat
 * hij in de handleiding als verplicht en niet als optioneel.
 */

import MicrosoftEntraID from "next-auth/providers/microsoft-entra-id";
import type { Provider } from "next-auth/providers";
import { entraUserFromProfile } from "./entra-profile";

export const ENTRA_PROVIDER_ID = "microsoft-entra-id";

export function entraProvider(): Provider {
  return MicrosoftEntraID({
    /**
     * De standaard-profile van deze provider haalt een profielfoto bij Graph op en zet die als base64
     * in de sessie. Dat blaast de sessiecookie op en kost een extra Graph-call bij elke login, terwijl
     * de rail initialen gebruikt. Dus overschreven.
     *
     * De roles-claim wordt hier meegenomen, want dit is het enige punt waar het Entra-token nog
     * beschikbaar is. Verder in de flow bestaat alleen nog onze eigen JWT.
     */
    profile(profile) {
      return entraUserFromProfile(profile);
    },
  });
}
