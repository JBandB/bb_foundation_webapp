/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import Link from "next/link";
import { labels } from "@/lib/i18n/labels";
import { PROJECT } from "@/lib/project/config.generated";

/**
 * De 404, in de taal en de huisstijl van de tool. Zonder dit bestand toont Next zijn eigen kale
 * pagina, in het Engels en zonder terugweg, op precies het moment dat iemand al verdwaald was.
 *
 * Geen sessie en geen database: een 404 rendert ook voor wie niet is ingelogd, en hoort niets te
 * lezen. De link wijst naar het beginscherm; wie geen sessie heeft, komt vanzelf op het inlogscherm.
 */
export default function NotFound() {
  return (
    <div className="grid min-h-screen place-items-center px-6">
      <div className="max-w-[420px] text-center">
        <div className="overline text-muted-foreground mb-2">404</div>
        <h1 className="mb-2 text-[22px] leading-tight">{labels.notFound.title}</h1>
        <p className="text-muted-foreground mb-5 text-[13px]">{labels.notFound.body}</p>
        <Link href={PROJECT.homePath} className="text-accent-quiet text-[13px] underline underline-offset-2">
          {labels.notFound.home}
        </Link>
      </div>
    </div>
  );
}
