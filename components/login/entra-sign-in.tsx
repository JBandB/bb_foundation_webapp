/* template-owned (module auth-entra). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { signIn } from "@/auth";
import { ENTRA_PROVIDER_ID } from "@/lib/auth/providers/entra";
import { labels } from "@/lib/i18n/labels";
import { PROJECT } from "@/lib/project/config.generated";
import { SignInButton } from "./sign-in-button";

/**
 * Inloggen met Microsoft Entra. Een form met een server action en niet een onClick, zodat inloggen ook
 * werkt zonder JavaScript.
 *
 * De zin eronder zegt wat dit scherm is en waar het inloggen gebeurt. Voor de collega die twijfelt,
 * en voor de classifier van Google Safe Browsing: een jong domein met een knop "Inloggen met
 * Microsoft" is precies het patroon dat die herkenning voor phishing houdt.
 */
export function EntraSignIn() {
  return (
    <div>
      <p className="text-foreground-soft text-[14px]">{labels.login.entraIntro}</p>
      <form
        className="mt-4"
        action={async () => {
          "use server";
          await signIn(ENTRA_PROVIDER_ID, { redirectTo: PROJECT.homePath });
        }}
      >
        <SignInButton label={labels.login.entraButton} busyLabel={labels.login.entraBusy} />
      </form>
      <p className="text-muted-foreground mt-3 max-w-[44ch] text-[12px] leading-snug">{labels.login.entraTrust}</p>
    </div>
  );
}
