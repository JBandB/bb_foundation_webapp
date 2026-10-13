/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { PROJECT } from "@/lib/project/config.generated";

/**
 * De Nederlandse teksten van de schermen die het template meebrengt. Dit is de sleutelbron: `en.ts`
 * moet precies dezelfde sleutels hebben (de test "geen vergeten vertalingen" bewaakt dat).
 *
 * Teksten van het project zelf horen niet hier maar in `lib/i18n/domain/<domein>.ts`, samengesteld
 * in `lib/i18n/labels.ts`. Dat bestand is van het project; dit bestand wordt bij een update van het
 * template overschreven. Teksten van modules die niet zijn toegepast staan er ook: een tekst die
 * niemand toont, kost niets.
 */
export const nl = {
  app: {
    name: PROJECT.name,
    shortName: PROJECT.shortName,
    description: PROJECT.description,
    organisation: PROJECT.organisationName,
  },

  nav: {
    home: "Naar het beginscherm",
    skipToContent: "Naar de inhoud",
    admin: "Beheer",
    signOut: "Uitloggen",
    signingOut: "Bezig",
    /* Eén label, want een schuifje toont zijn stand zelf. Zie components/ui/switch.tsx. */
    themeDark: "Donker",
    themeHint: "Wissel tussen de lichte en de donkere weergave",
  },

  /** De woorden van het bedieningspatroon zelf: Update wijzigt, een plusje maakt nieuw. */
  ui: {
    edit: "Update",
    add: "Nieuw",
    close: "Sluiten",
    remove: "Weghalen",
    none: "geen",
    breadcrumb: "Kruimelpad",
    topics: "Onderwerpen",
    popoverKeepOpen: "Er staat iets ingevuld, dus dit venster blijft staan. Sla op, of sluit het met Escape of met Sluiten hierboven.",
    from: "Van",
    until: "Tot en met",
    apply: "Toepassen",
  },

  form: {
    busy: "Bezig",
    save: "Opslaan",
    saving: "Opslaan",
    cancel: "Annuleren",
    optional: "optioneel",
    required: "Dit veld is verplicht.",
    tooLong: (max: number) => `Hoogstens ${max} tekens.`,
    failed: "Het opslaan lukte niet. Probeer het nog een keer.",
    tooMany: (minutes: number) => `Even wachten: probeer het over ${minutes} minuten opnieuw.`,
  },

  notFound: {
    title: "Deze pagina bestaat niet",
    body: "Het adres klopt niet meer, of je hebt geen toegang tot wat hier stond.",
    home: "Naar het beginscherm",
  },

  error: {
    title: "Er ging iets mis",
    body: "De fout is gemeld. Probeer het opnieuw; helpt dat niet, geef dan de code hieronder door aan de beheerder.",
    retry: "Probeer opnieuw",
    code: "code",
  },

  login: {
    title: `Inloggen bij ${PROJECT.name}`,
    failed: "Inloggen is niet gelukt. Controleer of je toegang hebt tot deze applicatie, en probeer het opnieuw.",
    whatsNew: (version: string) => `Nieuw in ${version}`,
    /* De Entra-module. */
    entraIntro: "Log in met het Microsoft-account van je organisatie.",
    entraButton: "Inloggen met Microsoft",
    entraBusy: "Je gaat naar Microsoft",
    entraTrust: `Dit is de interne tool van ${PROJECT.organisationName}. Inloggen gebeurt bij Microsoft zelf (login.microsoftonline.com); deze site vraagt nooit om je wachtwoord.`,
    /* De dev-login, alleen lokaal. */
    devTitle: "Dev-login",
    devIntro: "Alleen lokaal. Kies een dev-account en de rollen waarmee je wilt kijken.",
    devEmail: "E-mailadres",
    devRoles: "Rollen, gescheiden door komma's",
    devSubmit: "Inloggen als dit account",
    devHint: "Laat de rollen leeg om de rollen van het account te gebruiken.",
  },

  about: {
    eyebrow: "Over de tool",
    tabReleases: "Wat er nieuw is",
    tabRoadmap: "Roadmap",
    tabDecisions: "Besluiten",
    releasesTitle: "Wat er nieuw is",
    releasesIntro: "Per versie in gewone taal wat er voor jou is veranderd, nieuwste bovenaan. Het nummer linksonder in het menu is de versie die je nu gebruikt.",
    roadmapTitle: "Roadmap",
    roadmapIntro: "Per onderdeel hoe klaar het is en wat er nog moet. Staat iets hier als openstaand, dan is het bekend en hoef je het niet te melden.",
    decisionsTitle: "Besluiten en bewuste uitsluitingen",
    decisionsIntro:
      'Wat er is besloten, met de reden en de prijs erbij. Een besluit met "wat er niet in komt" is geen vergeten functie maar een keuze; vind je dat hij anders moet, meld het dan met wat het nu kost.',
    decisionsStand: (count: number, highest: number) => `Deze pagina leest het besluitenlog van de versie die nu draait: ${count} besluiten, tot en met D${highest}.`,
    empty: "Dit document is niet meegeleverd met deze versie.",
  },

  toolFeedback: {
    open: "Feedback",
    close: "Sluiten",
    hint: "Iets kapot of mis je een functie? Klik hier en typ het op; de beheerder ziet het met deze pagina erbij.",
    title: "Feedback op de tool",
    intro: "De pagina waar je nu bent gaat automatisch mee.",
    lookFirst: "Kijk eerst of het er al staat:",
    linkReleases: "Wat er nieuw is",
    linkRoadmap: "Wat er nog komt",
    linkDecisions: "Wat we bewust niet doen",
    titleField: "In één regel",
    bodyField: "Wat zie je, of wat wil je",
    send: "Versturen",
    sending: "Versturen",
    thanks: "Bedankt. Je melding staat genoteerd; de beheerder vindt hem onder Beheer, Feedback.",
  },

  admin: {
    eyebrow: "Beheer",
    tabAccess: "Toegang",
    tabSystem: "Systeem",
    tabFeedback: "Feedback",
  },

  access: {
    title: "Toegang",
    intro: "Wie er in de tool kan, met welke rol.",
    staffTitle: "Gebruikers",
    staffIntroEntra: "De rollen komen uit het Microsoft-account, zoals ze waren bij de laatste login. Toekennen gebeurt in het Entra-beheercentrum; wie daar geen rol heeft, komt er niet in.",
    staffIntroPassword: "De rollen worden hier beheerd. Een wijziging geldt bij het volgende verzoek van die persoon.",
    columnName: "Naam",
    columnEmail: "E-mailadres",
    columnRoles: "Rollen",
    columnSynced: "Laatste login",
    inactive: "inactief",
    noRoles: "geen rol",
    matrixTitle: "Wie mag wat",
    matrixIntro: "De rolmatrix zoals hij in de code staat, alleen-lezen. Dit is de volledige lijst: een recht dat hier niet staat, bestaat niet.",
    matrixAction: "Recht",
    empty: "Er heeft nog niemand ingelogd.",
  },

  /** De labels van de rechten uit het template; die van het project staan in lib/i18n/domain/actions.ts. */
  actions: {
    "admin:access": "Toegang beheren: wie er in de tool kan en met welke rol",
    "admin:system": "Beheer, Systeem: de stand van de tool, de koppelingen en de feedback",
    "admin:messages": "Berichten beheren: wie wat ontvangt",
    "files:read": "Bestanden downloaden",
    "files:write": "Bestanden uploaden en weghalen",
  },

  system: {
    title: "Systeem",
    intro: "De stand van de tool: versie, database en koppelingen. De eerste plek om te kijken als iets niet werkt.",
    version: "Versie",
    environment: "Omgeving",
    environmentLocal: "lokaal",
    schema: "Databaseschema",
    schemaOk: (applied: number, latest: string) => `${applied} migraties, tot en met ${latest}`,
    schemaBehind: (applied: number, expected: number) => `De database loopt achter: ${applied} van ${expected} migraties. Draai de deploy of pnpm db:migrate.`,
    schemaUnknown: "Niet op te vragen.",
    integrationsTitle: "Koppelingen",
    integrationsIntro: "Per koppeling of hij werkt, zonder iets te veranderen.",
    integrationsNone: "Dit project heeft geen koppelingen naar buiten.",
    statusOk: "werkt",
    statusWarning: "let op",
    statusError: "werkt niet",
    statusOff: "uit",
  },

  feedback: {
    title: "Feedback",
    intro: "Wat gebruikers over de tool hebben gemeld, nieuwste bovenaan.",
    columnWhen: "Wanneer",
    columnWho: "Wie",
    columnWhat: "Wat",
    columnWhere: "Waar",
    empty: "Er is nog niets gemeld.",
  },

  role: {
    none: "Geen rol",
  },

  placeholder: {
    title: "Het fundament staat",
    body: "Dit project is aangemaakt uit het template. Het eerste scherm komt uit het projectplan.",
    version: (version: string) => `Versie ${version}`,
  },
} as const;
