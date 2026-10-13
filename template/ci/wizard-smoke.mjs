/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De rooktest van de wizard: opent wizard/index.html vanaf file:// in een echte browser, doorloopt
 * de acht stappen met de casus van de kinderboerderij, leest de downloads en bewijst dat de
 * uitvoer klopt: project.config.json haalt pnpm template:validate, het projectplan heeft de twaalf
 * kopjes, de checklist draagt de slug, de startprompt noemt apply, nergens een em-dash, en de
 * browser logde geen fout. Daarna een herlaad: de antwoorden staan er nog.
 *
 *   node template/ci/wizard-smoke.mjs           draait en ruimt op
 *   node template/ci/wizard-smoke.mjs --keep    laat de downloads staan om erin te kijken
 *
 * Vraagt een geïnstalleerde Chromium: pnpm exec playwright install chromium. Lukt die download niet
 * (een proxy, geen internet), zet dan WIZARD_BROWSER op het pad van een chrome.exe of
 * chrome-headless-shell die er al staat; de test gebruikt dan die.
 */

import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { chromium } from "@playwright/test";

const root = process.cwd();
const keep = process.argv.includes("--keep");
const EM_DASH = String.fromCodePoint(0x2014);
const out = mkdtempSync(join(tmpdir(), "wizard-smoke-"));
const problems = [];
const browserErrors = [];

function check(ok, message) {
  if (!ok) problems.push(message);
  console.log(`${ok ? "ok " : "NEE"}  ${message}`);
}

/** De casus: één fictieve kinderboerderij, dezelfde als in de voorbeelden van de wizard. */
const CASE = {
  name: "Rooster De Weide",
  description: "Het vrijwilligersrooster van kinderboerderij De Weide: wie staat wanneer, en wie valt in.",
  organisation: "Kinderboerderij De Weide",
  domain: "deweide.example",
  owner: "Anna, de coördinator van de vrijwilligers",
  slug: "rooster-de-weide",
  content: {
    "t-why": "Het rooster staat in een spreadsheet die drie mensen tegelijk bewerken. Elke week valt er een dienst uit.",
    "t-success": "De coördinator stuurt geen rooster meer per mail, en elke dienst van de komende maand heeft een naam.",
    "t-concepts": "Een dienst is een dagdeel op een locatie met een gewenst aantal mensen. Een inschrijving koppelt een vrijwilliger aan een dienst.",
    "t-processes": "Een dienst vullen: 1. de coördinator maakt de diensten aan; 2. vrijwilligers schrijven zich in; 3. wie past krijgt een mail.",
    "t-rules": "P1: een vrijwilliger kan niet op twee diensten tegelijk staan. P2: een dienst in het verleden verandert niet meer.",
    "t-not": "Geen urenregistratie, geen onkosten, geen app in de winkels.",
  },
};

const executablePath = process.env.WIZARD_BROWSER;
let browser;
try {
  browser = await chromium.launch(executablePath === undefined || executablePath === "" ? {} : { executablePath });
  const context = await browser.newContext({ acceptDownloads: true, locale: "nl-NL", timezoneId: "Europe/Amsterdam" });
  const page = await context.newPage();
  page.setDefaultTimeout(15_000);
  page.on("pageerror", (error) => browserErrors.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") browserErrors.push(message.text());
  });
  const url = pathToFileURL(join(root, "wizard", "index.html")).href;
  await page.goto(url);
  const heading = page.locator("#step-heading");
  const next = async (expected) => {
    await page.getByRole("button", { name: "Volgende", exact: true }).click();
    await heading.waitFor({ state: "visible" });
    const text = await heading.textContent();
    check(text?.startsWith(expected) === true, `door naar "${expected}" (kop: ${text?.trim()})`);
  };

  // Stap 0.
  check((await heading.textContent())?.trim() === "Welkom", "het welkomscherm staat open");
  await page.getByRole("button", { name: "Begin", exact: true }).click();

  // Stap 1: projectbasis. Geen tenant, dus wachtwoordlogin en SMTP.
  await page.fill("#f-name", CASE.name);
  check((await page.inputValue("#f-slug")) === CASE.slug, "de slug volgt de naam");
  await page.fill("#f-description", CASE.description);
  await page.fill("#f-org", CASE.organisation);
  await page.fill("#f-domain", CASE.domain);
  await page.fill("#f-owner", CASE.owner);
  await page.check("#f-m365-1");
  await page.check("#f-mfa-0");
  await next("Stap 2");

  // Stap 2: rollen en mensen. Een tweede rol met een afgeleide waarde, een derde met een eigen waarde.
  await page.fill("#r-1-nl", "Coördinator");
  await page.fill("#r-1-en", "Coordinator");
  check((await page.inputValue("#r-1-value")) === "coordinator", "de rolwaarde volgt het label, zonder trema");
  await page.fill("#r-1-who", "de twee coördinatoren");
  await page.fill("#r-1-may", "diensten plannen en alle vrijwilligers zien");
  await page.fill("#r-1-maynot", "niemand verwijderen");
  await page.getByRole("button", { name: "Rol toevoegen" }).click();
  await page.fill("#r-2-nl", "Vrijwilliger");
  await page.fill("#r-2-en", "Volunteer");
  await page.fill("#r-2-value", "volunteer");
  await page.fill("#f-count", "45");
  await page.check("#f-audience-0");
  await next("Stap 3");

  // Stap 3: de inhoud.
  for (const [id, text] of Object.entries(CASE.content)) await page.fill(`#${id}`, text);
  await next("Stap 4");

  // Stap 4: modules. Berichten staat vast aan door de wachtwoordlogin; Graph is niet te kiezen zonder tenant.
  check(await page.isChecked("#m-messaging"), "berichten staat aan door de wachtwoordlogin");
  check(await page.isChecked("#m-jobs"), "achtergrondwerk staat aan door berichten");
  check(await page.isDisabled("#m-transport-0"), "Graph is zonder tenant niet te kiezen");
  check(await page.isChecked("#m-transport-1"), "SMTP is het transport");
  await page.check("#m-files");
  await page.check("#m-azure-1");
  await page.fill("#m-retention", "Tot een jaar nadat de vrijwilliger is gestopt.");
  await next("Stap 5");

  // Stap 5: accounts en budget, voor de diensten die bij deze keuzes horen.
  await page.check("#f-commercial-1");
  await page.fill("#f-budget", "15");
  const split = { github: "0", vercel: "0", neon: "0", azure: "5", mail: "5" };
  for (const [key, euros] of Object.entries(split)) {
    await page.check(`#a-${key}-exists-0`);
    await page.check(`#a-${key}-owner-0`);
    await page.fill(`#a-${key}-admin`, "Anna");
    await page.fill(`#b-${key}`, euros);
  }
  check((await page.locator("#a-m365-admin").count()) === 0, "Microsoft 365 staat niet tussen de diensten zonder tenant");
  await next("Stap 6");

  // Stap 6: huisstijl, met de standaardkleuren.
  check((await page.inputValue("#f-short")) === CASE.name, "de korte naam volgt de naam");
  check((await page.locator("#contrast li.pass").count()) >= 8, "de standaardkleuren halen het contrast");
  await next("Stap 7");

  // Stap 7: één fase.
  await page.fill("#p-0-name", "Rooster en inschrijven");
  await page.fill("#p-0-contents", "De coördinator maakt diensten aan en vrijwilligers schrijven zich in.");
  await page.fill("#p-0-exit", "Elke dienst van de komende maand staat in de tool en invallen gaat via de tool.");
  await page.fill("#p-0-manual", "De gedeelde postbus en de ledenlijst.");
  await next("Stap 8");

  // Stap 8: controle en downloads.
  check((await page.locator("#review-errors").count()) === 0, "de controle vindt geen open punten");
  const files = {};
  for (const name of ["project.config.json", "PROJECTPLAN.md", `00-checklist-${CASE.slug}.md`, "startprompt.md"]) {
    const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("button", { name: `Download ${name}` }).click()]);
    const path = join(out, download.suggestedFilename());
    await download.saveAs(path);
    files[name] = readFileSync(path, "utf8");
    check(download.suggestedFilename() === name, `download ${name}`);
  }

  // De configuratie door de validator van het template.
  const configPath = join(out, "project.config.json");
  const validate = spawnSync(process.execPath, [join(root, "template", "cli", "bootstrap.mjs"), "validate", configPath], { cwd: root, encoding: "utf8" });
  check(validate.status === 0, `template:validate op de uitvoer${validate.status === 0 ? "" : `:\n${validate.stdout}${validate.stderr}`}`);
  const config = JSON.parse(files["project.config.json"]);
  check(config.auth.provider === "password" && config.auth.password.mfaRequiredFor === "admins", "inlog: wachtwoord met tweestapsverificatie voor beheerders");
  check(JSON.stringify(config.modules) === JSON.stringify(["auth-password", "jobs", "messaging", "files"]), `modules: ${JSON.stringify(config.modules)}`);
  check(config.messaging.transport === "smtp", "transport smtp");
  check(config.auth.roles.map((role) => role.value).join(",") === "admin,coordinator,volunteer", "drie rollen in volgorde");
  check(config.project.systemEmail === `system@${CASE.domain}`, "systeemadres uit het maildomein");
  check(config.intake.budget.monthlyEuros === 15 && config.intake.accounts.length === 5, "de intake bewaart budget en accounts");

  // Het projectplan, de checklist en de startprompt.
  const plan = files["PROJECTPLAN.md"];
  const headings = (plan.match(/^## \d+\. /gm) ?? []).length;
  check(headings === 12, `het projectplan heeft twaalf kopjes (${headings})`);
  check(plan.includes("| Coördinator (`coordinator`) |") && plan.includes("P1: een vrijwilliger"), "het projectplan bevat de rollen en de regels");
  check(plan.includes("### Fase 1: Rooster en inschrijven"), "het projectplan bevat de fase");
  const checklist = files[`00-checklist-${CASE.slug}.md`];
  check(checklist.includes(`\`${CASE.slug}\``) && checklist.includes("handleiding 05b") && checklist.includes("Transport SMTP"), "de checklist volgt de keuzes");
  check(!checklist.includes("Inloggen met Microsoft"), "de checklist slaat Entra over");
  const prompt = files["startprompt.md"];
  check(prompt.includes("pnpm template:apply") && prompt.includes("Git doe ik zelf"), "de startprompt noemt apply en laat git bij de mens");
  for (const [name, text] of Object.entries(files)) check(!text.includes(EM_DASH), `geen em-dash in ${name}`);

  // Herladen: de antwoorden staan er nog en de wizard biedt aan verder te gaan.
  await page.reload();
  await heading.waitFor({ state: "visible" });
  check(await page.getByRole("button", { name: "Verder bij stap 8" }).isVisible(), "na herladen gaat de wizard verder bij stap 8");
  await page.getByRole("button", { name: "Verder bij stap 8" }).click();
  check((await heading.textContent())?.startsWith("Stap 8") === true, "stap 8 staat na herladen weer open");

  check(browserErrors.length === 0, `geen fouten in de browser${browserErrors.length === 0 ? "" : `:\n  ${browserErrors.join("\n  ")}`}`);
} catch (error) {
  /* Een test die halverwege omvalt (browser niet gevonden, een veld dat niet bestaat) is een probleem, geen stacktrace. */
  problems.push(`de test brak af: ${error instanceof Error ? error.message.split("\n")[0] : String(error)}`);
  console.error(error);
} finally {
  if (browser !== undefined) await browser.close();
  if (keep) console.log(`\nDownloads staan in ${out}`);
  else rmSync(out, { recursive: true, force: true });
}

if (problems.length > 0) {
  console.error(`\nWizard-rooktest: ${problems.length} probleem(en).`);
  process.exit(1);
}
console.log("\nWizard-rooktest: schoon.");
