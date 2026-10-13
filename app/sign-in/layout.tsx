/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het inlogscherm staat altijd in de lichte modus.
 *
 * Wie hier komt heeft geen sessie, dus er is geen voorkeur om te volgen. Vastzetten in plaats van
 * terugvallen scheelt het geval waarin een ingelogde gebruiker deze pagina alsnog opent en hem donker
 * krijgt terwijl iedereen anders hem licht ziet. Dit scherm is technisch publiek en hoort er voor
 * iedereen hetzelfde uit te zien.
 */
export default function SignInLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <div className="light bg-background text-foreground min-h-dvh">{children}</div>;
}
