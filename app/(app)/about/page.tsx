/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { redirect } from "next/navigation";

/** Wie op /about uitkomt, wil meestal weten wat er net is veranderd. */
export default function AboutIndex(): never {
  redirect("/about/releases");
}
