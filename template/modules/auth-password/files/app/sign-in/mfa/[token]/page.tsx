/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { Mark } from "@/components/brand/mark";
import { MfaCodeForm } from "@/components/login/mfa-code-form";
import { beginMfaSetup, personBehindToken } from "@/lib/auth/password/accounts";
import { qrSvg } from "@/lib/auth/password/qr";
import { getDb } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";
import { confirmMfaByTokenAction } from "../../password-flows-actions";

/* Het token staat in het pad: geef het niet mee als Referer aan wat deze pagina verder opent. */
export const metadata = { title: labels.password.mfaTitle, referrer: "no-referrer" as const };

/**
 * De stap na een login die tweestapsverificatie eist, zonder sessie. Het inlogscherm stuurt hierheen
 * na een juist wachtwoord, met een vers eenmalig token in het pad (zie `signInWithPassword`).
 */
export default async function MfaSetupPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();
  const person = await personBehindToken(db, token, "mfa_setup");
  const setup = person === undefined ? undefined : await beginMfaSetup(db, person.id);

  return (
    <main className="grid min-h-svh place-items-center px-6 py-12">
      <div className="w-full max-w-[30rem]">
        <Mark className="text-[28px]" />
        <h1 className="mt-8 text-[26px] leading-tight">{labels.password.mfaTitle}</h1>
        <div className="mt-6">
          {setup === undefined ? (
            <p role="alert" className="text-[14px]">
              {labels.password.mfaExpired}
            </p>
          ) : (
            <>
              <p className="mb-4 text-[14px]">{labels.password.mfaSetupRequired}</p>
              <MfaCodeForm action={confirmMfaByTokenAction.bind(null, token)} qrSvg={await qrSvg(setup.otpauth)} secret={setup.secret} doneLink={{ href: "/sign-in", label: labels.password.backToSignIn }} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
