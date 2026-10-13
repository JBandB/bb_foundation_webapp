/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import Link from "next/link";
import { MfaCodeForm } from "@/components/login/mfa-code-form";
import { PageBody, Section } from "@/components/page-body";
import { PageHeader } from "@/components/page-header";
import { buttonClass } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { beginMfaSetup, securityState } from "@/lib/auth/password/accounts";
import { qrSvg } from "@/lib/auth/password/qr";
import { requireSession } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";
import { confirmMfaAction } from "./actions";
import { ChangePasswordForm, DisableMfaForm } from "./forms";

export const metadata = { title: labels.password.securityTitle };

/**
 * Mijn account: wachtwoord wijzigen en tweestapsverificatie aan of uit. Instellen begint met
 * `?mfa=setup`: dan zet de server een geheim klaar en toont de QR-code.
 */
export default async function SecurityPage({ searchParams }: { searchParams: Promise<{ mfa?: string }> }) {
  const actor = await requireSession();
  const { mfa } = await searchParams;
  const db = getDb();
  const state = await securityState(db, actor.id);
  const setup = mfa === "setup" && !state.mfaEnabled && state.hasPassword ? await beginMfaSetup(db, actor.id) : undefined;

  return (
    <>
      <PageHeader eyebrow={labels.app.name} title={labels.password.securityTitle} />

      <PageBody>
        <Section title={labels.password.changePasswordTitle} intro={labels.password.securityIntro}>
          <ChangePasswordForm />
        </Section>

        <Section title={labels.password.mfaSectionTitle}>
          <div className="flex flex-col gap-4">
            <p className="flex items-center gap-2 text-[13px]">
              <Chip tone={state.mfaEnabled ? "success" : state.mfaRequired ? "danger" : "neutral"}>{state.mfaEnabled ? labels.password.mfaYes : labels.password.mfaNo}</Chip>
              <span>{state.mfaEnabled ? labels.password.mfaOn : state.mfaRequired ? labels.password.mfaOffRequired : labels.password.mfaOff}</span>
            </p>

            {state.mfaEnabled ? (
              state.mfaRequired ? (
                <p className="text-muted-foreground text-[12px]">{labels.password.mfaCannotDisable}</p>
              ) : (
                <DisableMfaForm />
              )
            ) : setup !== undefined ? (
              <MfaCodeForm action={confirmMfaAction} qrSvg={await qrSvg(setup.otpauth)} secret={setup.secret} />
            ) : (
              <div>
                <Link href="/account/security?mfa=setup" className={buttonClass("primary")}>
                  {labels.password.mfaStart}
                </Link>
              </div>
            )}
          </div>
        </Section>
      </PageBody>
    </>
  );
}
