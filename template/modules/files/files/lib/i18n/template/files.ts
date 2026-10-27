/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import type { Widen } from "./en";

/** De teksten van de module files, in beide talen, onder `labels.files`. */
const nl = {
  chooseFile: "Kies een bestand",
  limits: (types: string, megabytes: number) => `${types}, hoogstens ${megabytes} MB.`,
  upload: "Uploaden",
  uploading: "Bezig",
  uploaded: (name: string) => `${name} staat erbij.`,
  remove: "Verwijderen",
  removed: "Het bestand is verwijderd.",
  download: "Downloaden",
  none: "Er zijn nog geen bestanden.",
  errors: {
    notConfigured: (missing: string) => `De opslag is nog niet ingericht; ontbreekt: ${missing}.`,
    empty: "Het bestand is leeg.",
    tooLarge: (megabytes: number) => `Het bestand is te groot; de grens ligt op ${megabytes} MB.`,
    wrongType: (allowed: string) => `Dit bestandstype kan niet. Toegestaan: ${allowed}.`,
    notText: "Dit is geen tekstbestand, en een CSV hoort dat te zijn.",
    notCsv: "Dit bestand is geen CSV, ook al heet het zo.",
    mismatch: "De inhoud van het bestand past niet bij het type dat het zegt te zijn.",
    macros: "Dit bestand bevat macro's, en die nemen we niet aan.",
    oldOffice: "Dit is een oud Office-formaat (.xls of .doc), waarin macro's niet te zien zijn. Sla het op als .xlsx of .docx.",
    tooMany: "Je hebt het afgelopen uur veel bestanden gebracht. Probeer het later opnieuw.",
    rejected: (detail: string) => `De opslag weigerde het bestand (${detail}).`,
    notFound: "Dit bestand bestaat niet of is al verwijderd.",
  },
  healthName: "Bestandsopslag",
  healthMissing: (missing: readonly string[]) => `Niet ingericht; ontbreekt: ${missing.join(", ")}.`,
  healthNoExpiry: "Ingericht, maar BLOB_SAS_EXPIRES is leeg: de vervaldatum van het token is onbekend.",
  healthExpired: "Het token is verlopen; uploaden en downloaden werken niet meer.",
  healthExpiresSoon: (days: number) => `Het token verloopt over ${days} ${days === 1 ? "dag" : "dagen"}; maak op tijd een nieuw.`,
  healthOk: (purposes: number, days: number) => `Ingericht voor ${purposes} ${purposes === 1 ? "doel" : "doelen"}; het token is nog ${days} dagen geldig.`,
};

const en = {
  chooseFile: "Choose a file",
  limits: (types: string, megabytes: number) => `${types}, at most ${megabytes} MB.`,
  upload: "Upload",
  uploading: "Working",
  uploaded: (name: string) => `${name} has been added.`,
  remove: "Remove",
  removed: "The file has been removed.",
  download: "Download",
  none: "There are no files yet.",
  errors: {
    notConfigured: (missing: string) => `Storage is not set up yet; missing: ${missing}.`,
    empty: "The file is empty.",
    tooLarge: (megabytes: number) => `The file is too large; the limit is ${megabytes} MB.`,
    wrongType: (allowed: string) => `This file type is not allowed. Allowed: ${allowed}.`,
    notText: "This is not a text file, and a CSV should be one.",
    notCsv: "This file is not a CSV, even though it is named like one.",
    mismatch: "The contents of the file do not match the type it claims to be.",
    macros: "This file contains macros, and we do not accept those.",
    oldOffice: "This is an old Office format (.xls or .doc), in which macros cannot be seen. Save it as .xlsx or .docx.",
    tooMany: "You have uploaded many files in the past hour. Try again later.",
    rejected: (detail: string) => `Storage rejected the file (${detail}).`,
    notFound: "This file does not exist or has already been removed.",
  },
  healthName: "File storage",
  healthMissing: (missing: readonly string[]) => `Not set up; missing: ${missing.join(", ")}.`,
  healthNoExpiry: "Set up, but BLOB_SAS_EXPIRES is empty: the expiry date of the token is unknown.",
  healthExpired: "The token has expired; uploading and downloading no longer work.",
  healthExpiresSoon: (days: number) => `The token expires in ${days} ${days === 1 ? "day" : "days"}; create a new one in time.`,
  healthOk: (purposes: number, days: number) => `Set up for ${purposes} ${purposes === 1 ? "purpose" : "purposes"}; the token is valid for another ${days} days.`,
} satisfies Widen<typeof nl>;

export const filesLabels: Readonly<Record<"nl" | "en", Widen<typeof nl>>> = { nl, en };
