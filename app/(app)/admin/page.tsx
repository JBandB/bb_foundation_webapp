/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { notFound, redirect } from "next/navigation";
import { requireSession } from "@/lib/auth/session";
import { adminTabs } from "./tabs";

/** Wie op /admin uitkomt, gaat naar zijn eerste tabblad. */
export default async function AdminIndex(): Promise<never> {
  const actor = await requireSession();
  const first = adminTabs(actor)[0];
  if (first === undefined) notFound();
  redirect(first.href);
}
