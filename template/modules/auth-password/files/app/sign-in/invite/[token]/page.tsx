/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { Mark } from "@/components/brand/mark";
import { NewPasswordForm } from "@/components/login/new-password-form";
import { personBehindToken } from "@/lib/auth/password/accounts";
import { getDb } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";
import { acceptInviteAction } from "../../password-flows-actions";

export const metadata = { title: labels.password.inviteTitle };

export default async function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const person = await personBehindToken(getDb(), token, "invite");

  return (
    <main className="grid min-h-svh place-items-center px-6 py-12">
      <div className="w-full max-w-[26rem]">
        <Mark className="text-[28px]" />
        <h1 className="mt-8 text-[26px] leading-tight">{labels.password.inviteTitle}</h1>
        <div className="mt-6">
          {person === undefined ? (
            <p role="alert" className="text-[14px]">
              {labels.password.inviteExpired}
            </p>
          ) : (
            <>
              <p className="text-foreground-soft mb-4 text-[14px]">{labels.password.inviteIntro(person.displayName)}</p>
              <NewPasswordForm action={acceptInviteAction.bind(null, token)} submitLabel={labels.password.setPassword} />
            </>
          )}
        </div>
      </div>
    </main>
  );
}
