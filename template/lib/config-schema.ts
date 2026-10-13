/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De vorm van `project.config.json`, in de schemataal uit dsl.ts. Dit is de enige beschrijving: de
 * validatie, de standaardwaarden, het TypeScript-type (`ProjectConfig`) en het JSON Schema voor de
 * wizard komen er alle vier uit voort. Wat hier niet staat, bestaat niet.
 *
 * De teksten zijn voor mensen die het bestand in een editor openen, dus gewone taal en een voorbeeld
 * waar dat helpt. Velden met `derived` vult config.ts in als ze ontbreken; velden met `default` vult
 * de validatie in. De rest is verplicht.
 */
import type { Infer, ObjectSchema, StringSchema } from "./dsl";

const ROLE_VALUE = /^[a-z][a-z0-9_]{1,30}$/;

function hex(description: string, fallback?: string): StringSchema {
  return fallback === undefined
    ? { kind: "string", format: "hex", description }
    : { kind: "string", format: "hex", description, default: fallback };
}

const ROLE_SCHEMA = {
  kind: "object",
  description: "Een rol: de waarde in code en database, het label in beide talen, en of de rol beheerder is.",
  fields: {
    value: {
      kind: "string",
      pattern: ROLE_VALUE,
      patternHint: "kleine letters, cijfers en liggende streepjes, beginnend met een letter, 2 tot 31 tekens",
      description: "De naam in code en database, zoals admin of coordinator. Bij Entra is dit de waarde van de app role.",
    },
    label: {
      kind: "object",
      description: "Het label in de interface, in beide talen.",
      fields: {
        nl: { kind: "string", minLength: 1, maxLength: 40, description: "Het Nederlandse label, zoals Beheerder." },
        en: { kind: "string", minLength: 1, maxLength: 40, description: "Het Engelse label, zoals Administrator." },
      },
    },
    admin: {
      kind: "boolean",
      default: false,
      description: "Een beheerdersrol mag alles, ook Beheer. Minstens één rol heeft dit aan.",
    },
  },
} as const satisfies ObjectSchema;

export const DEFAULT_ROLES = [
  { value: "admin", label: { nl: "Beheerder", en: "Administrator" }, admin: true },
  { value: "member", label: { nl: "Lid", en: "Member" }, admin: false },
] as const;

const DEV_USER_SCHEMA = {
  kind: "object",
  description: "Een account van de dev-login, alleen lokaal.",
  fields: {
    email: { kind: "string", format: "email", description: "Het adres waarmee je lokaal inlogt. Hoeft niet te bestaan; gebruik een .invalid-domein." },
    displayName: { kind: "string", minLength: 1, maxLength: 60, description: "De naam in de rail." },
    roles: {
      kind: "array",
      of: { kind: "string", pattern: ROLE_VALUE, description: "Een rolwaarde uit auth.roles." },
      minItems: 1,
      unique: true,
      description: "De rollen van dit account, uit auth.roles.",
    },
  },
} as const satisfies ObjectSchema;

const MODULE_NAME = /^[a-z][a-z0-9-]*$/;

export const PROJECT_CONFIG_SCHEMA = {
  kind: "object",
  description:
    "De configuratie van een project uit het template BB_foundation_webapp. De wizard schrijft dit bestand, pnpm template:apply leest het en de generatoren leiden er het thema, de rollen en de projectgegevens uit af.",
  fields: {
    configVersion: {
      kind: "integer",
      const: 1,
      description: "De versie van dit bestandsformaat. Altijd 1 in deze versie van het template.",
    },
    project: {
      kind: "object",
      description: "Naam, taal en adressen van het project.",
      fields: {
        name: {
          kind: "string",
          minLength: 2,
          maxLength: 60,
          description: "De volledige naam, zoals hij in de titelbalk en op het inlogscherm staat.",
        },
        shortName: {
          kind: "string",
          minLength: 1,
          maxLength: 20,
          derived: "de naam, afgekapt op 20 tekens",
          description: "De korte naam voor de rail en het tekstmerk, hoogstens 20 tekens.",
        },
        slug: {
          kind: "string",
          pattern: /^[a-z][a-z0-9-]{1,30}$/,
          patternHint: "kleine letters, cijfers en koppeltekens, beginnend met een letter, 2 tot 31 tekens",
          description:
            "De technische naam: voor de repo, het Vercel-project, de database en de cookies. Verandert daarna nooit meer.",
        },
        description: {
          kind: "string",
          minLength: 10,
          maxLength: 200,
          description: "Eén zin die zegt wat het project is. Komt in de metadata van de pagina en in README.md.",
        },
        organisation: {
          kind: "object",
          description: "De organisatie die het project gebruikt.",
          fields: {
            name: { kind: "string", minLength: 2, maxLength: 80, description: "De naam van de organisatie, onderin de rail en in mails." },
            mailDomain: {
              kind: "nullable",
              of: { kind: "string", format: "domain", description: "Een domeinnaam, zoals voorbeeld.nl." },
              default: null,
              description: "Het maildomein van de organisatie. Bepaalt het systeemadres als dat niet is ingevuld.",
            },
          },
        },
        uiLanguage: {
          kind: "string",
          enum: ["nl", "en"],
          default: "nl",
          description: "De taal van de interface. De documentatie is altijd Nederlands.",
        },
        timezone: {
          kind: "string",
          format: "timezone",
          default: "Europe/Amsterdam",
          description: "De tijdzone voor datums en voor het rooster van de crons (IANA-naam).",
        },
        currency: {
          kind: "string",
          pattern: /^[A-Z]{3}$/,
          patternHint: "drie hoofdletters, zoals EUR",
          default: "EUR",
          description: "De standaardvaluta (ISO 4217). Alleen van belang als het project met geld rekent.",
        },
        systemEmail: {
          kind: "string",
          format: "email",
          derived: "system@<maildomein>, of system@<slug>.invalid als er geen maildomein is",
          description: "De afzender in de audit log voor crons en taken. Hoeft geen echte postbus te zijn.",
        },
        productionUrl: {
          kind: "nullable",
          of: { kind: "string", format: "https-url", description: "Een adres dat met https:// begint." },
          default: null,
          description: "Het adres van de productieomgeving, zoals https://rooster.voorbeeld.nl. Leeg tot het bekend is.",
        },
        homePath: {
          kind: "string",
          format: "path",
          default: "/home",
          description: "Waar de voorpagina heen stuurt na het inloggen.",
        },
      },
    },
    brand: {
      kind: "object",
      description: "De huisstijl. De generator leidt hier het hele thema uit af, in licht en donker, en bewaakt het contrast.",
      fields: {
        colours: {
          kind: "object",
          description: "De merkkleuren als hex. Twee zijn verplicht, de rest heeft een neutrale standaard.",
          fields: {
            primary: hex("De hoofdkleur: knoppen, links, de ring rond het veld met focus."),
            accent: hex("De tweede kleur: accenten, de tekstselectie, de tweede grafiekkleur."),
            surface: hex("De achtergrond van de pagina in de lichte modus.", "#f6f7f9"),
            ink: hex("De tekstkleur in de lichte modus.", "#1b1f24"),
            success: hex("Gelukt, actief, akkoord.", "#2f7d52"),
            warning: hex("Let op, wacht op iets.", "#8f6a22"),
            danger: hex("Fout, verwijderen, geweigerd.", "#b04a35"),
            info: hex("Neutrale mededeling.", "#2f6f79"),
          },
        },
        darkMode: {
          kind: "string",
          enum: ["auto", "off"],
          default: "auto",
          description: "auto: elke gebruiker kiest licht of donker. off: alleen licht, de donkere modus wordt niet gegenereerd.",
        },
        radius: {
          kind: "string",
          enum: ["sharp", "soft", "round"],
          default: "sharp",
          description: "De afronding van hoeken. sharp: 2 tot 8 px. soft: 4 tot 12 px. round: 8 tot 16 px.",
        },
        logo: {
          kind: "object",
          description: "Het logo in de rail en op het inlogscherm.",
          fields: {
            kind: {
              kind: "string",
              enum: ["wordmark", "image"],
              default: "wordmark",
              description: "wordmark: de korte naam als tekstmerk. image: een SVG uit public/brand/.",
            },
            path: {
              kind: "nullable",
              of: {
                kind: "string",
                pattern: /^public\/brand\/[a-z0-9-]+\.svg$/,
                patternHint: "een SVG onder public/brand/, zoals public/brand/logo.svg",
                description: "Het pad naar het SVG-bestand.",
              },
              default: null,
              description: "Het pad naar het logo. Verplicht bij kind image, leeg bij wordmark.",
            },
            darkPath: {
              kind: "nullable",
              of: {
                kind: "string",
                pattern: /^public\/brand\/[a-z0-9-]+\.svg$/,
                patternHint: "een SVG onder public/brand/, zoals public/brand/logo-dark.svg",
                description: "Het pad naar het SVG-bestand voor de donkere modus.",
              },
              default: null,
              description: "Een aparte versie voor de donkere modus, als het logo daar niet leesbaar is.",
            },
          },
        },
      },
    },
    auth: {
      kind: "object",
      description: "Inloggen en rollen.",
      fields: {
        provider: {
          kind: "string",
          enum: ["entra", "password"],
          description:
            "entra: inloggen met het Microsoft-account van de organisatie (module auth-entra). password: eigen accounts met wachtwoord en tweestapsverificatie (module auth-password).",
        },
        roles: {
          kind: "array",
          of: ROLE_SCHEMA,
          minItems: 1,
          maxItems: 8,
          default: DEFAULT_ROLES,
          description: "De rollen van het project. Minstens één is beheerder. Bij Entra zijn dit de app roles in de tenant.",
        },
        password: {
          kind: "object",
          description: "Instellingen van de wachtwoordlogin. Alleen van belang bij provider password.",
          fields: {
            mfaRequiredFor: {
              kind: "string",
              enum: ["admins", "everyone", "nobody"],
              default: "admins",
              description: "Voor wie tweestapsverificatie verplicht is. Standaard voor beheerders.",
            },
          },
        },
        devUsers: {
          kind: "array",
          of: DEV_USER_SCHEMA,
          unique: true,
          derived: "één dev-account per rol, <rol>@dev.invalid",
          description: "De accounts van de dev-login, alleen lokaal (AUTH_DEV_LOGIN=1). Op Vercel bestaat de dev-login niet.",
        },
      },
    },
    modules: {
      kind: "array",
      of: { kind: "string", pattern: MODULE_NAME, patternHint: "een modulenaam in kleine letters", description: "Een modulenaam uit template/manifest.json." },
      unique: true,
      derived: "alleen de inlogmodule die bij auth.provider hoort",
      description: "De toegepaste modules, zonder core (die is er altijd). Welke er zijn staat in template/manifest.json.",
    },
    messaging: {
      kind: "object",
      description: "Hoe het project mail en meldingen verstuurt (module messaging).",
      fields: {
        transport: {
          kind: "string",
          enum: ["smtp", "graph"],
          default: "smtp",
          description: "smtp: een gewone mailserver of mailaanbieder. graph: een gedeelde postbus in Microsoft 365, via een app-registratie.",
        },
        teams: { kind: "boolean", default: false, description: "Ook meldingen naar een Teams-kanaal, via een webhook." },
      },
    },
    hosting: {
      kind: "object",
      description: "Waar het project draait. Namen, nooit geheimen.",
      fields: {
        region: {
          kind: "string",
          pattern: /^[a-z]{3}[0-9]$/,
          patternHint: "een Vercel-regiocode, zoals fra1",
          default: "fra1",
          description: "De Vercel-regio voor serverfuncties. fra1 is Frankfurt, dicht bij een Neon-database in de EU.",
        },
        github: {
          kind: "nullable",
          of: {
            kind: "string",
            pattern: /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/,
            patternHint: "organisatie/repo, zoals mijn-org/rooster",
            description: "De repo als organisatie/naam.",
          },
          default: null,
          description: "De GitHub-repo als organisatie/naam, zodra die bestaat.",
        },
        vercelTeam: {
          kind: "nullable",
          of: { kind: "string", minLength: 1, description: "De naam van het Vercel-team of -account." },
          default: null,
          description: "Het Vercel-team of -account waar het project onder hangt.",
        },
        neonProject: {
          kind: "nullable",
          of: { kind: "string", minLength: 1, description: "De naam van het Neon-project." },
          default: null,
          description: "Het Neon-project van de database.",
        },
      },
    },
    template: {
      kind: "object",
      description: "Voorkeuren voor de template-tooling.",
      fields: {
        source: {
          kind: "nullable",
          of: { kind: "string", format: "git-url", description: "Een git-adres." },
          default: null,
          description: "Het git-adres van het template als dat afwijkt van template/manifest.json, bijvoorbeeld een eigen fork.",
        },
        skipDependencies: {
          kind: "array",
          of: { kind: "string", minLength: 1, description: "Een pakketnaam." },
          unique: true,
          default: [],
          description: "Pakketten waarvan het project zelf de versie bepaalt; template:update laat die pin met rust.",
        },
        keepCrons: {
          kind: "array",
          of: { kind: "string", format: "path", description: "Het pad van een cronroute." },
          unique: true,
          default: [],
          description: "Cronpaden waarvan het project zelf het rooster bepaalt; template:update laat die met rust.",
        },
      },
    },
    intake: {
      kind: "any",
      description:
        "De antwoorden uit de wizard: accounts, budget, fasen. Alleen voor de wizard en de handleidingen; de tooling leest dit niet.",
    },
  },
} as const satisfies ObjectSchema;

export type ProjectConfig = Infer<typeof PROJECT_CONFIG_SCHEMA>;
export type Role = Infer<typeof ROLE_SCHEMA>;
export type DevUser = Infer<typeof DEV_USER_SCHEMA>;
export type AuthProvider = ProjectConfig["auth"]["provider"];
