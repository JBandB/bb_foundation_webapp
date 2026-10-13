/* template-generated (registry) uit project.config.json. Niet bewerken: pnpm template:generate schrijft hem opnieuw. */
/**
 * Wat de toegepaste modules op het inlogscherm zetten. Apart van `registry.generated.ts` omdat deze
 * componenten `signIn` uit auth.ts importeren, en auth.ts het serverregister leest.
 */
import type { ComponentType } from "react";
import { EntraSignIn } from "@/components/login/entra-sign-in";

/** De knoppen op het inlogscherm, één per inlogmethode. */
export const LOGIN_BUTTONS: readonly ComponentType[] = [EntraSignIn];

/** Wat er verder op het inlogscherm staat, zoals het hulpformulier van de module messaging. */
export const LOGIN_EXTRAS: readonly ComponentType[] = [];
