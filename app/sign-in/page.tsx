/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Mark } from "@/components/brand/mark";
import { DevSignIn } from "@/components/login/dev-sign-in";
import { devLoginEnabled } from "@/lib/auth/providers/dev-login";
import { labels } from "@/lib/i18n/labels";
import { PROJECT } from "@/lib/project/config.generated";
import { LOGIN_BUTTONS, LOGIN_EXTRAS } from "@/lib/project/ui-registry.generated";
import { APP_HIGHLIGHTS, APP_VERSION } from "@/lib/version";

/**
 * Het inlogscherm. Eén kolom, gecentreerd: het merk, de titel, de knoppen van de toegepaste
 * inlogmodules, wat er nieuw is, en wat de modules er verder bij zetten (zoals een hulpformulier).
 *
 * Dit scherm is technisch publiek: geen namen van gebruikers en geen bedragen. Wat er nieuw is komt
 * uit `APP_HIGHLIGHTS` in lib/version.ts, hooguit drie regels die per versie meeverversen.
 */
export const metadata = { title: labels.login.title };

export default async function SignInPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const session = await auth();
  if (session?.user !== undefined && session.user.id !== "") redirect(PROJECT.homePath);

  const { error } = await searchParams;

  return (
    <main className="grid min-h-svh place-items-center px-6 py-12">
      <div className="w-full max-w-[26rem]">
        <Mark className="text-[28px]" />

        <h1 className="mt-8 text-[26px] leading-tight">{labels.login.title}</h1>

        {error !== undefined && (
          <div role="alert" className="rounded-md border-destructive/25 bg-destructive-bg text-destructive-foreground mt-5 border px-3.5 py-3 text-[13px]">
            {labels.login.failed}
          </div>
        )}

        <div className="mt-6 flex flex-col gap-6">
          {LOGIN_BUTTONS.map((Button, index) => (
            <Button key={index} />
          ))}
        </div>

        <div className="border-border bg-muted mt-8 rounded-md border px-4 py-3.5">
          <div className="overline text-muted-foreground">{labels.login.whatsNew(APP_VERSION)}</div>
          <ul className="text-foreground-soft mt-2 flex flex-col gap-1 text-[12.5px]">
            {APP_HIGHLIGHTS.map((highlight) => (
              <li key={highlight}>{highlight}</li>
            ))}
          </ul>
        </div>

        {LOGIN_EXTRAS.map((Extra, index) => (
          <div key={index} className="mt-4">
            <Extra />
          </div>
        ))}

        {devLoginEnabled && <DevSignIn />}

        <footer className="text-subtle-foreground mt-10 flex items-center gap-3 text-[11px]">
          <span>{labels.app.organisation}</span>
          <span className="num ml-auto">{APP_VERSION}</span>
        </footer>
      </div>
    </main>
  );
}
