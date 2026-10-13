/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import coreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

const noEmDash =
  "Geen em-dashes. Gebruik een komma, dubbele punt, haakjes of een nieuwe zin.";

const config = [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "next-env.d.ts",
      // De bronbestanden van opt-in modules verwijzen naar modules die hier niet toegepast zijn.
      "template/modules/**",
      // Kopieën van overschreven bestanden, zie pnpm template:apply --force.
      ".template-backup/**",
    ],
  },
  ...coreWebVitals,
  ...nextTypescript,
  {
    rules: {
      // Geen `any`, geen `!` op databaseresultaten. Zie CLAUDE.md.
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/no-non-null-assertion": "error",

      /*
       * Een parameter met een liggend streepje ervoor is bewust ongebruikt.
       *
       * De standaardinstelling meldt alleen de laatste ongebruikte parameter, dus `_previous` bleef
       * stil zolang `form` er wel werd gebruikt en ging klagen zodra een actie geen van beide nodig
       * had. Een server action die via `useActionState` loopt krijgt altijd de vorige staat en het
       * formulier mee, ook als hij ze niet leest. De vorm ligt vast, dus dat is geen dode code.
       */
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],

      // Geen em-dashes in code of copy. lint:house dekt de andere bestandstypes.
      "no-restricted-syntax": [
        "error",
        { selector: "Literal[value=/\\u2014/]", message: noEmDash },
        { selector: "TemplateElement[value.raw=/\\u2014/]", message: noEmDash },
        { selector: "JSXText[value=/\\u2014/]", message: noEmDash },
      ],

      // Domeindata en voorkeuren horen in de database, niet in de browser. Zie CLAUDE.md.
      "no-restricted-globals": [
        "error",
        {
          name: "localStorage",
          message:
            "Geen localStorage voor domeindata of voorkeuren. Voorkeuren staan in user_preferences, zie CLAUDE.md.",
        },
        {
          name: "sessionStorage",
          message:
            "Geen sessionStorage voor domeindata of voorkeuren. Voorkeuren staan in user_preferences, zie CLAUDE.md.",
        },
      ],
    },
  },
];

export default config;
