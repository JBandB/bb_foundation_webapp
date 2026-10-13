/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { PROJECT } from "@/lib/project/config.generated";
import type { nl } from "./nl";

/**
 * Strings worden `string`, functies houden hun signatuur. Zonder dit zou `satisfies` eisen dat de
 * Engelse tekst letterlijk gelijk is aan de Nederlandse, en dat is precies het omgekeerde van de
 * bedoeling. Wat overblijft is de sleutelcontrole: een tekst die in nl.ts bijkomt en hier niet,
 * compileert niet.
 */
export type Widen<T> = T extends string
  ? string
  : T extends (...args: infer A) => infer R
    ? (...args: A) => Widen<R>
    : T extends readonly (infer U)[]
      ? readonly Widen<U>[]
      : T extends object
        ? { readonly [K in keyof T]: Widen<T[K]> }
        : T;

export type TemplateLabels = Widen<typeof nl>;

export const en = {
  app: {
    name: PROJECT.name,
    shortName: PROJECT.shortName,
    description: PROJECT.description,
    organisation: PROJECT.organisationName,
  },

  nav: {
    home: "Go to the start screen",
    skipToContent: "Skip to content",
    admin: "Admin",
    signOut: "Sign out",
    signingOut: "Working",
    themeDark: "Dark",
    themeHint: "Switch between the light and the dark view",
  },

  ui: {
    edit: "Update",
    add: "New",
    close: "Close",
    remove: "Remove",
    none: "none",
    breadcrumb: "Breadcrumb",
    topics: "Topics",
    popoverKeepOpen: "Something is filled in, so this panel stays open. Save, or close it with Escape or with Close above.",
    from: "From",
    until: "Up to and including",
    apply: "Apply",
  },

  form: {
    busy: "Working",
    save: "Save",
    saving: "Saving",
    cancel: "Cancel",
    optional: "optional",
    required: "This field is required.",
    tooLong: (max: number) => `At most ${max} characters.`,
    failed: "Saving did not work. Please try again.",
    tooMany: (minutes: number) => `Please wait: try again in ${minutes} minutes.`,
  },

  notFound: {
    title: "This page does not exist",
    body: "The address is no longer valid, or you do not have access to what used to be here.",
    home: "Go to the start screen",
  },

  error: {
    title: "Something went wrong",
    body: "The error has been reported. Try again; if that does not help, pass the code below to the administrator.",
    retry: "Try again",
    code: "code",
  },

  login: {
    title: `Sign in to ${PROJECT.name}`,
    failed: "Signing in did not work. Check whether you have access to this application, and try again.",
    whatsNew: (version: string) => `New in ${version}`,
    entraIntro: "Sign in with the Microsoft account of your organisation.",
    entraButton: "Sign in with Microsoft",
    entraBusy: "Redirecting to Microsoft",
    entraTrust: `This is the internal tool of ${PROJECT.organisationName}. Signing in happens at Microsoft itself (login.microsoftonline.com); this site never asks for your password.`,
    devTitle: "Dev sign-in",
    devIntro: "Local only. Pick a dev account and the roles you want to look with.",
    devEmail: "Email address",
    devRoles: "Roles, comma separated",
    devSubmit: "Sign in as this account",
    devHint: "Leave the roles empty to use the roles of the account.",
  },

  about: {
    eyebrow: "About this tool",
    tabReleases: "What is new",
    tabRoadmap: "Roadmap",
    tabDecisions: "Decisions",
    releasesTitle: "What is new",
    releasesIntro: "Per version, in plain language, what changed for you, newest first. The number at the bottom left of the menu is the version you are using now.",
    roadmapTitle: "Roadmap",
    roadmapIntro: "Per part how finished it is and what remains. If something is listed here as open, it is known and you do not need to report it.",
    decisionsTitle: "Decisions and deliberate exclusions",
    decisionsIntro:
      'What has been decided, with the reason and the price. A decision about "what is left out" is not a forgotten feature but a choice; if you think it should be different, report it with what it costs now.',
    decisionsStand: (count: number, highest: number) => `This page reads the decision log of the version that is running: ${count} decisions, up to D${highest}.`,
    empty: "This document was not shipped with this version.",
  },

  toolFeedback: {
    open: "Feedback",
    close: "Close",
    hint: "Something broken, or missing a feature? Click here and type it up; the administrator sees it with this page attached.",
    title: "Feedback on the tool",
    intro: "The page you are on is attached automatically.",
    lookFirst: "First check whether it is already there:",
    linkReleases: "What is new",
    linkRoadmap: "What is coming",
    linkDecisions: "What we deliberately do not do",
    titleField: "In one line",
    bodyField: "What do you see, or what do you want",
    send: "Send",
    sending: "Sending",
    thanks: "Thank you. Your report has been noted; the administrator finds it under Admin, Feedback.",
  },

  admin: {
    eyebrow: "Admin",
    tabAccess: "Access",
    tabSystem: "System",
    tabFeedback: "Feedback",
  },

  access: {
    title: "Access",
    intro: "Who can use the tool, and with which role.",
    staffTitle: "Users",
    staffIntroEntra: "Roles come from the Microsoft account, as they were at the last sign-in. Assigning happens in the Entra admin centre; whoever has no role there cannot get in.",
    staffIntroPassword: "Roles are managed here. A change applies on the next request of that person.",
    columnName: "Name",
    columnEmail: "Email address",
    columnRoles: "Roles",
    columnSynced: "Last sign-in",
    inactive: "inactive",
    noRoles: "no role",
    matrixTitle: "Who may do what",
    matrixIntro: "The role matrix as it is in the code, read-only. This is the complete list: a right that is not here does not exist.",
    matrixAction: "Right",
    empty: "Nobody has signed in yet.",
  },

  actions: {
    "admin:access": "Manage access: who can use the tool and with which role",
    "admin:system": "Admin, System: the state of the tool, the integrations and the feedback",
    "admin:messages": "Manage messages: who receives what",
    "files:read": "Download files",
    "files:write": "Upload and remove files",
  },

  system: {
    title: "System",
    intro: "The state of the tool: version, database and integrations. The first place to look when something does not work.",
    version: "Version",
    environment: "Environment",
    environmentLocal: "local",
    schema: "Database schema",
    schemaOk: (applied: number, latest: string) => `${applied} migrations, up to ${latest}`,
    schemaBehind: (applied: number, expected: number) => `The database is behind: ${applied} of ${expected} migrations. Run the deploy or pnpm db:migrate.`,
    schemaUnknown: "Could not be read.",
    integrationsTitle: "Integrations",
    integrationsIntro: "Per integration whether it works, without changing anything.",
    integrationsNone: "This project has no external integrations.",
    statusOk: "works",
    statusWarning: "attention",
    statusError: "does not work",
    statusOff: "off",
  },

  feedback: {
    title: "Feedback",
    intro: "What users have reported about the tool, newest first.",
    columnWhen: "When",
    columnWho: "Who",
    columnWhat: "What",
    columnWhere: "Where",
    empty: "Nothing has been reported yet.",
  },

  role: {
    none: "No role",
  },

  placeholder: {
    title: "The foundation is in place",
    body: "This project was created from the template. The first screen comes from the project plan.",
    version: (version: string) => `Version ${version}`,
  },
} satisfies TemplateLabels;
