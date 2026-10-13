/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { notFound } from "next/navigation";
import { SubNav } from "@/components/ui/sub-nav";
import { requireSession } from "@/lib/auth/session";
import { adminTabs } from "./tabs";

/**
 * Beheer: de tabbladen bovenin, en een 404 voor wie er niets te zoeken heeft. Een 404 en geen
 * "geen toegang": welke schermen er bestaan is niets wat iemand zonder rechten hoeft te weten.
 *
 * Geen `loading.tsx` in deze tak: een laadgrens maakt van de pagina een stream en dan wordt de 404
 * een 200. Zie components/ui/loading.tsx.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const actor = await requireSession();
  const tabs = adminTabs(actor);
  if (tabs.length === 0) notFound();

  return (
    <>
      <SubNav items={tabs} />
      {children}
    </>
  );
}
