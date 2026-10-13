/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { signIn } from "@/auth";
import { DEV_LOGIN_PROVIDER_ID } from "@/lib/auth/providers/dev-login";
import { APP_ROLES } from "@/lib/auth/roles";
import { labels } from "@/lib/i18n/labels";
import { PROJECT } from "@/lib/project/config.generated";

/**
 * De lokale rolwisselaar. Zie lib/auth/providers/dev-login.ts.
 *
 * Staat zichtbaar in de pagina en niet achter een toetsencombinatie, omdat een verborgen achterdeur
 * erger is dan een zichtbare die in een deploy niet bestaat. De aanroepende pagina rendert dit
 * component alleen als `devLoginEnabled` waar is, en die vlag kan in een deploy niet waar zijn.
 */
export function DevSignIn() {
  const first = PROJECT.devUsers[0];

  return (
    <div className="border-warning/40 bg-warning-bg rounded-md mt-8 border p-4">
      <div className="font-display text-[13px]">{labels.login.devTitle}</div>
      <p className="text-foreground-soft mt-1 text-[12.5px]">{labels.login.devIntro}</p>

      <form
        className="mt-4 flex flex-col gap-3"
        action={async (formData: FormData) => {
          "use server";
          await signIn(DEV_LOGIN_PROVIDER_ID, {
            email: String(formData.get("email") ?? ""),
            roles: String(formData.get("roles") ?? ""),
            redirectTo: PROJECT.homePath,
          });
        }}
      >
        <label className="text-[12px]">
          {labels.login.devEmail}
          <input name="email" type="email" required defaultValue={first?.email ?? ""} className="border-border-strong rounded-md bg-input mt-1 block w-full border px-2.5 py-2 text-[13px]" />
        </label>

        <label className="text-[12px]">
          {labels.login.devRoles}
          <input name="roles" type="text" placeholder={APP_ROLES.join(", ")} className="border-border-strong rounded-md bg-input mt-1 block w-full border px-2.5 py-2 text-[13px]" />
        </label>

        <button type="submit" className="bg-primary text-primary-foreground rounded-md border-primary cursor-pointer border px-3.5 py-2 text-[13px] font-semibold active:translate-y-px">
          {labels.login.devSubmit}
        </button>

        <p className="text-muted-foreground text-[11.5px]">{labels.login.devHint}</p>
      </form>
    </div>
  );
}
