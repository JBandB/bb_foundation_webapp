/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { signOutAction } from "@/app/(app)/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { labels } from "@/lib/i18n/labels";

/**
 * De uitlogknop, als formulier. Servercomponent, zodat de server action rechtstreeks als `action` mee
 * kan; de knop erin is een clientcomponent, want die moet weten dat hij bezig is.
 *
 * De variant is `bare`: geen knopvorm, geen padding, geen centrering. In de rail staat deze knop onder
 * een schuifje en naast een naam die allebei links beginnen.
 */
export function SignOut() {
  return (
    <form action={signOutAction}>
      <SubmitButton variant="bare" className="text-on-dark/70 hover:text-on-dark text-[13px]" busyLabel={labels.nav.signingOut}>
        {labels.nav.signOut}
      </SubmitButton>
    </form>
  );
}
