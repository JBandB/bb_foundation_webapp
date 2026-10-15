/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
"use server";

import { CredentialsSignin } from "next-auth";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import type { FormState } from "@/components/ui/form-state";
import { issueMfaSetupToken } from "@/lib/auth/password/accounts";
import { PASSWORD_PROVIDER_ID } from "@/lib/auth/providers/password-login";
import { getDb } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";
import { PROJECT } from "@/lib/project/config.generated";

/**
 * Inloggen met wachtwoord. Lukt het, dan stuurt Auth.js door (dat is een redirect-fout die we laten
 * gaan). Mislukt het, dan komt hier één van drie uitkomsten: de code uit de app is nodig, eerst
 * tweestapsverificatie instellen, of gewoon mislukt, zonder te zeggen waarom.
 *
 * Moet tweestapsverificatie eerst worden ingesteld, dan gaat de persoon in dezelfde stap door naar
 * de instelpagina met de QR-code. Vroeger kwam die koppeling per mail, en zonder ingerichte mail
 * sloot de eerste beheerder zichzelf buiten. `issueMfaSetupToken` controleert het wachtwoord zelf
 * opnieuw voordat er een token komt; klopt er iets niet meer, dan is de uitkomst gewoon mislukt.
 */
export async function signInWithPassword(_previous: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  let setupToken: string | undefined;
  try {
    await signIn(PASSWORD_PROVIDER_ID, { email, password, code: String(form.get("code") ?? ""), redirectTo: PROJECT.homePath });
    return { errors: {} };
  } catch (error) {
    if (!(error instanceof CredentialsSignin)) throw error;
    if (error.code === "mfa") return { errors: { code: labels.password.mfaRequired } };
    if (error.code !== "mfa_setup") return { errors: { form: labels.password.failed } };
    setupToken = await issueMfaSetupToken(getDb(), email, password);
  }
  if (setupToken === undefined) return { errors: { form: labels.password.failed } };
  /* Buiten de try: redirect werkt met een eigen fout, en die mag niet in de catch hierboven belanden. */
  redirect(`/sign-in/mfa/${setupToken}`);
}
