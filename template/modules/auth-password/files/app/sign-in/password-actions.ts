/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use server";

import { CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";
import type { FormState } from "@/components/ui/form-state";
import { PASSWORD_PROVIDER_ID } from "@/lib/auth/providers/password-login";
import { labels } from "@/lib/i18n/labels";
import { PROJECT } from "@/lib/project/config.generated";

/**
 * Inloggen met wachtwoord. Lukt het, dan stuurt Auth.js door (dat is een redirect-fout die we laten
 * gaan). Mislukt het, dan komt hier één van drie uitkomsten: de code uit de app is nodig, eerst
 * tweestapsverificatie instellen, of gewoon mislukt, zonder te zeggen waarom.
 */
export async function signInWithPassword(_previous: FormState, form: FormData): Promise<FormState> {
  try {
    await signIn(PASSWORD_PROVIDER_ID, {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      code: String(form.get("code") ?? ""),
      redirectTo: PROJECT.homePath,
    });
    return { errors: {} };
  } catch (error) {
    if (error instanceof CredentialsSignin) {
      if (error.code === "mfa") return { errors: { code: labels.password.mfaRequired } };
      if (error.code === "mfa_setup") return { errors: { form: labels.password.mfaSetupRequired } };
      return { errors: { form: labels.password.failed } };
    }
    throw error;
  }
}
