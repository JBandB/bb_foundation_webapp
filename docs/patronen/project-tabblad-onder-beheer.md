<!-- template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. -->
# Een project-tabblad onder Beheer

**Wanneer.** Het project heeft iets te beheren dat niet in een gewoon scherm hoort: instellingen,
een importknop, een lijst met uitzonderingen.

**Het patroon.** Een eigen recht in `lib/auth/actions.ts` (bijvoorbeeld `admin:imports`), een regel in
de matrix, een tabblad in `app/(app)/admin/tabs.project.ts` achter dat recht, en een pagina
`app/(app)/admin/<naam>/page.tsx` die zelf opnieuw controleert (`can`, anders `notFound()`: wie het
niet mag, hoeft niet te weten dat het bestaat). De layout van Beheer geeft een 404 als er voor
iemand geen enkel tabblad is, en de rail toont Beheer alleen als er wel een is. Bewerkingen volgen
de vaste vorm: Update en plusje in de sectiekop, een zwevend paneel, een server action met het recht
erbij en een auditregel.

```ts
// app/(app)/admin/tabs.project.ts
export function projectAdminTabs(actor: Actor): SubNavItem[] {
  return can(actor, "admin:imports") ? [{ href: "/admin/imports", label: labels.imports.tab }] : [];
}

// app/(app)/admin/imports/page.tsx
export default async function ImportsPage() {
  const actor = await requireSession();
  if (!can(actor, "admin:imports")) notFound();
  const imports = await listImports(getDb(), actor);
  return (
    <>
      <PageHeader eyebrow={labels.admin.eyebrow} title={labels.imports.title} />
      <PageBody>
        <Section title={labels.imports.title} intro={labels.imports.intro} actions={<PopoverDisclosure label={labels.ui.add} title={labels.imports.add}><ImportForm /></PopoverDisclosure>}>
          <ImportsTable rows={imports} />
        </Section>
      </PageBody>
    </>
  );
}
```

**Wat het kost.** Een recht, een regel, een pagina, en een e2e vanaf `10` die bewijst dat een rol
zonder het recht een 404 krijgt (de e2e `05` van het template is het voorbeeld).

**Waar in het template.** `app/(app)/admin/tabs.ts` (de volgorde: kern, modules, project),
`tabs.project.ts` (seed), de pagina's van de kern onder `app/(app)/admin/` als voorbeeld.
