/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De rooktest op een draaiende omgeving, na elke uitrol.
 *
 *   pnpm smoke:prod                                  tegen productionUrl uit project.config.json
 *   pnpm smoke:prod -- --url=http://localhost:3100   tegen een lokale, gebouwde server
 *
 * **Alleen lezen, zonder sessie, zonder gegevens.** Dit script logt niet in, kent geen geheim en raakt
 * geen enkele rij. Het doet wat een onbekende bezoeker ook kan: een handvol openbare adressen ophalen,
 * en kijken of alles wat achter de sessie hoort ook echt dicht is.
 *
 * **Wat het bewijst.** Het inlogscherm staat en toont de versie van deze werkkopie (zodat "werkt het
 * al?" één commando is); alles achter de sessie stuurt door naar de inlog; elke cron uit vercel.json
 * weigert zonder geheim; robots.txt en security.txt staan; en de security headers staan op elke pagina.
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PROJECT } from "../lib/project/config.generated";
import { APP_VERSION } from "../lib/version";
import { runScript } from "./lib/run";

const TIMEOUT_MS = 15_000;

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail?: string): void {
  if (ok) {
    passed += 1;
    console.log(`  ok    ${name}`);
    return;
  }
  failed += 1;
  console.log(`  FOUT  ${name}`);
  if (detail !== undefined) console.log(`        ${detail}`);
}

function baseUrl(): string {
  const flag = process.argv.find((arg) => arg.startsWith("--url="));
  if (flag !== undefined) return flag.slice("--url=".length).replace(/\/+$/, "");
  if (PROJECT.productionUrl !== null) return PROJECT.productionUrl.replace(/\/+$/, "");
  throw new Error("Geen adres: zet project.productionUrl in project.config.json (en draai pnpm template:generate), of geef --url=... mee.");
}

interface Fetched {
  readonly status: number;
  readonly location: string | null;
  readonly contentType: string;
  readonly headers: Headers;
  readonly body: string;
  readonly ms: number;
}

/* Geen redirects volgen: dat een pagina doorstuurt is precies wat we willen zien. */
async function get(base: string, path: string, headers: Record<string, string> = {}): Promise<Fetched> {
  const started = Date.now();
  const response = await fetch(`${base}${path}`, {
    redirect: "manual",
    cache: "no-store",
    signal: AbortSignal.timeout(TIMEOUT_MS),
    headers: { "user-agent": `${PROJECT.slug}-smoke/${APP_VERSION}`, ...headers },
  });
  const body = await response.text();
  return { status: response.status, location: response.headers.get("location"), contentType: response.headers.get("content-type") ?? "", headers: response.headers, body, ms: Date.now() - started };
}

function redirectsToSignIn(page: Fetched): boolean {
  return page.status >= 300 && page.status < 400 && page.location !== null && page.location.includes("/sign-in");
}

/** De cronpaden uit vercel.json, zodat een nieuwe cron vanzelf meetelt. */
function cronPaths(): string[] {
  try {
    const json = JSON.parse(readFileSync(join(process.cwd(), "vercel.json"), "utf8")) as { crons?: { path?: unknown }[] };
    return [...new Set((json.crons ?? []).map((cron) => cron.path).filter((path): path is string => typeof path === "string"))];
  } catch {
    return [];
  }
}

runScript(async () => {
  const base = baseUrl();
  console.log(`Rooktest op ${base}, werkkopie ${APP_VERSION}\n`);

  console.log("1. Het inlogscherm");
  const signIn = await get(base, "/sign-in");
  check("het inlogscherm geeft 200", signIn.status === 200, `status ${signIn.status}`);
  const shown = /v\d+\.\d+/.exec(signIn.body)?.[0] ?? null;
  check(
    "en toont de versie van deze werkkopie",
    shown === APP_VERSION,
    shown === null ? "geen versienummer gevonden op het inlogscherm" : `de omgeving toont ${shown}, de werkkopie is ${APP_VERSION}: de uitrol is nog niet live, of je draait lokaal vooruit`,
  );
  check("het inlogscherm laadt binnen vijf seconden", signIn.ms < 5_000, `${signIn.ms} ms`);

  console.log("\n2. Alles achter de sessie is dicht");
  for (const path of [PROJECT.homePath, "/admin", "/about/releases"]) {
    const page = await get(base, path);
    check(`${path} stuurt zonder sessie door naar de inlog`, redirectsToSignIn(page), `status ${page.status}, location ${page.location ?? "geen"}`);
  }

  console.log("\n3. De achtergrondtaken weigeren zonder geheim");
  const crons = cronPaths();
  if (crons.length === 0) console.log("  (geen crons in vercel.json)");
  for (const path of crons) {
    const page = await get(base, path);
    /* De guard geeft 404 en geen 401: wie geen token heeft, hoeft niet te weten dat de route bestaat. */
    check(`${path} geeft 404 zonder token`, page.status === 404, `status ${page.status}`);
  }

  console.log("\n4. Wat het domein publiceert");
  const robots = await get(base, "/robots.txt");
  check("robots.txt staat als tekst", robots.status === 200 && robots.contentType.startsWith("text/plain"), `status ${robots.status}, ${robots.contentType}`);
  check("en sluit de tool af voor zoekmachines", robots.body.includes("Disallow: /"));
  const security = await get(base, "/.well-known/security.txt");
  check("security.txt staat als tekst", security.status === 200 && security.contentType.startsWith("text/plain"), `status ${security.status}, ${security.contentType}`);
  check("en noemt een contact", security.body.includes("Contact:"));

  console.log("\n5. De security headers");
  check("een Content-Security-Policy", (signIn.headers.get("content-security-policy") ?? "").includes("default-src"));
  check("X-Frame-Options DENY", signIn.headers.get("x-frame-options") === "DENY");
  check("X-Content-Type-Options nosniff", signIn.headers.get("x-content-type-options") === "nosniff");
  check("HSTS met includeSubDomains", (signIn.headers.get("strict-transport-security") ?? "").includes("includeSubDomains"));
  check("Cross-Origin-Opener-Policy same-origin", signIn.headers.get("cross-origin-opener-policy") === "same-origin");
  check("geen X-Powered-By", signIn.headers.get("x-powered-by") === null);

  console.log(`\n${passed} goed, ${failed} fout.`);
  if (failed > 0) process.exitCode = 1;
});
