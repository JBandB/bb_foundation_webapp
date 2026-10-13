/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { redirect } from "next/navigation";
import { PROJECT } from "@/lib/project/config.generated";

/** De voorpagina stuurt door naar het beginscherm uit project.config.json; zonder sessie komt iemand vanzelf op de inlog. */
export default function Page(): never {
  redirect(PROJECT.homePath);
}
