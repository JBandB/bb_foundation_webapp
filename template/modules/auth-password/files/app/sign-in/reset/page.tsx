/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { Mark } from "@/components/brand/mark";
import { ResetRequestForm } from "@/components/login/reset-request-form";
import { labels } from "@/lib/i18n/labels";

export const metadata = { title: labels.password.resetTitle };

export default function ResetRequestPage() {
  return (
    <main className="grid min-h-svh place-items-center px-6 py-12">
      <div className="w-full max-w-[26rem]">
        <Mark className="text-[28px]" />
        <h1 className="mt-8 text-[26px] leading-tight">{labels.password.resetTitle}</h1>
        <div className="mt-6">
          <ResetRequestForm />
        </div>
      </div>
    </main>
  );
}
