/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De opdrachten van de template-tooling. Gestart door bootstrap.mjs met de wortel van het project als
 * werkmap. Elke opdracht geeft een exitcode terug en schrijft voor mensen: wat er gebeurd is en wat
 * er nog moet gebeuren, in die volgorde.
 */
import { readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { CONFIG_FILE, parseConfig } from "../lib/config";
import { formatProblems } from "../lib/dsl";
import { appliedModules, loadManifest } from "../lib/manifest";
import { runAdd } from "./add";
import { runAdopt } from "./adopt";
import { runApply } from "./apply";
import { generate } from "./generate";
import { runRelease } from "./release";
import { runStatus } from "./status";
import { runUpdate } from "./update";
import { runVerify } from "./verify";
import { writeSchemaFile } from "./schema";

type Command = (root: string, args: readonly string[]) => number;

const COMMANDS: Readonly<Record<string, { readonly run: Command; readonly help: string }>> = {
  validate: {
    help: "controleert project.config.json (of een pad als argument) en zegt wat eraan schort",
    run: validate,
  },
  schema: {
    help: "schrijft template/schema/project.config.schema.json uit de schemataal (alleen in de templaterepo)",
    run: (root) => {
      const path = writeSchemaFile(root);
      console.log(`JSON Schema geschreven naar ${path}.`);
      return 0;
    },
  },
  apply: {
    help: "past het template toe op dit project: generatoren, bestanden per module, gedeelde bestanden, lock (--dry-run, --force, --strict, --allow-dirty, --source <map>)",
    run: (root, args) => runApply(root, args),
  },
  update: {
    help: "haalt een nieuwere versie van het template op en past haar toe (--to X.Y.Z, --from <map>, en de opties van apply)",
    run: (root, args) => runUpdate(root, args),
  },
  add: {
    help: "zet een module (en wat ze vereist) in project.config.json en past toe: template:add <module>",
    run: (root, args) => runAdd(root, args),
  },
  release: {
    help: "alleen in de templaterepo: versie omhoog, CHANGELOG afsluiten, lock bijwerken: template:release X.Y.Z",
    run: (root, args) => runRelease(root, args),
  },
  status: {
    help: "hoe het template in dit project staat (--changes noemt elk gewijzigd bestand, --offline slaat de versiecheck over)",
    run: (root, args) => runStatus(root, args),
  },
  verify: {
    help: "voor CI: klopt het project nog met zijn lock",
    run: (root) => runVerify(root),
  },
  adopt: {
    help: "maakt een bestand van het template blijvend van het project: template:adopt <pad> [--remove]",
    run: (root, args) => runAdopt(root, args),
  },
  generate: {
    help: "schrijft de gegenereerde bestanden (thema, tokens, PROJECT, rollen, schema-index, registers) opnieuw uit project.config.json",
    run: (root) => generate(root),
  },
  version: {
    help: "toont de versie van het template in deze repo",
    run: (root) => {
      console.log(loadManifest(root).version);
      return 0;
    },
  },
};

function validate(root: string, args: readonly string[]): number {
  const manifest = loadManifest(root);
  const argument = args[0];
  const path = argument === undefined ? join(root, CONFIG_FILE) : isAbsolute(argument) ? argument : join(root, argument);
  let text: string;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    console.error(`${path} is niet te lezen.`);
    return 1;
  }
  const report = parseConfig(text, manifest);
  if (report.warnings.length > 0) {
    console.log("Waarschuwingen:");
    console.log(formatProblems(report.warnings));
  }
  if (report.config === undefined) {
    console.error(`${path} is niet geldig:`);
    console.error(formatProblems(report.errors));
    return 1;
  }
  const modules = appliedModules(manifest, report.config.modules);
  const planned = modules.filter((name) => manifest.modules[name]?.status === "planned");
  console.log(`${path} is geldig.`);
  console.log(`Project: ${report.config.project.name} (${report.config.project.slug}), taal ${report.config.project.uiLanguage}, inloggen via ${report.config.auth.provider}.`);
  console.log(`Modules, in volgorde van toepassen: ${modules.join(", ")}.`);
  if (planned.length > 0) {
    console.log(`Nog niet beschikbaar in template ${manifest.version}: ${planned.join(", ")}. Apply slaat die over tot ze er zijn.`);
  }
  return 0;
}

function help(): number {
  console.log("Gebruik: pnpm template:<opdracht> [argumenten]\n");
  for (const [name, command] of Object.entries(COMMANDS)) console.log(`  ${name.padEnd(10)} ${command.help}`);
  return 0;
}

function main(): number {
  const root = process.cwd();
  const [name = "help", ...args] = process.argv.slice(2);
  if (name === "help" || name === "--help" || name === "-h") return help();
  const command = COMMANDS[name];
  if (command !== undefined) return command.run(root, args);
  console.error(`Onbekende opdracht "${name}".\n`);
  help();
  return 1;
}

try {
  process.exit(main());
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
