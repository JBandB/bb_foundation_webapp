/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import Link from "next/link";
import { Mark } from "@/components/brand/mark";
import { NewPasswordForm } from "@/components/login/new-password-form";
import { personBehindToken } from "@/lib/auth/password/accounts";
import { getDb } from "@/lib/db/client";
import { labels } from "@/lib/i18n/labels";
import { completeResetAction } from "../../password-flows-actions";

export const metadata = { title: labels.password.resetNewTitle };

export default async function ResetWithTokenPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const person = await personBehindToken(getDb(), token, "reset");

  return (
    <main className="grid min-h-svh place-items-center px-6 py-12">
      <div className="w-full max-w-[26rem]">
        <Mark className="text-[28px]" />
        <h1 className="mt-8 text-[26px] leading-tight">{labels.password.resetNewTitle}</h1>
        <div className="mt-6">
          {person === undefined ? (
            <div className="flex flex-col gap-4">
              <p role="alert" className="text-[14px]">
                {labels.password.resetExpired}
              </p>
              <Link href="/sign-in/reset" className="text-accent-quiet text-[13px] underline-offset-2 hover:underline">
                {labels.password.resetTitle}
              </Link>
            </div>
          ) : (
            <NewPasswordForm action={completeResetAction.bind(null, token)} submitLabel={labels.password.setPassword} />
          )}
        </div>
      </div>
    </main>
  );
}
