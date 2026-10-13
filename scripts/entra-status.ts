/* template-owned (module auth-entra). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm entra:status`: klopt de inrichting van de Microsoft-login, voor zover dat zonder extra
 * rechten te zien is. De drie variabelen, de tenant in de issuer (geen `common`), het openbare
 * OpenID-document van die tenant, en de rollen die de tool verwacht zodat je ze naast de app roles
 * in de portal kunt leggen. De app roles zelf uitlezen vraagt een Graph-recht dat de inlog niet
 * nodig heeft, en dat recht vragen we niet voor een controle.
 */
import { APP_ROLES, ROLE_LABELS } from "../lib/auth/roles";
import { fetchWithTimeout } from "../lib/integrations/http";
import { runScript } from "./lib/run";

runScript(async () => {
  const clientId = process.env.AUTH_MICROSOFT_ENTRA_ID_ID ?? "";
  const secret = process.env.AUTH_MICROSOFT_ENTRA_ID_SECRET ?? "";
  const issuer = process.env.AUTH_MICROSOFT_ENTRA_ID_ISSUER ?? "";
  let problems = 0;

  const line = (ok: boolean, text: string): void => {
    if (!ok) problems += 1;
    console.log(`  ${ok ? "ok  " : "FOUT"} ${text}`);
  };

  console.log("Variabelen");
  line(clientId !== "", "AUTH_MICROSOFT_ENTRA_ID_ID is gezet");
  line(/^[0-9a-f-]{36}$/i.test(clientId), "de client-id is een GUID (de Application (client) ID, niet de Secret ID)");
  line(secret !== "", "AUTH_MICROSOFT_ENTRA_ID_SECRET is gezet (de waarde zelf wordt niet getoond)");
  line(issuer !== "", "AUTH_MICROSOFT_ENTRA_ID_ISSUER is gezet");

  const tenant = /login\.microsoftonline\.com\/([^/]+)\/v2\.0\/?$/.exec(issuer)?.[1] ?? "";
  line(tenant !== "" && tenant !== "common" && tenant !== "organizations", `de issuer noemt een echte tenant (${tenant === "" ? "geen" : tenant})`);

  if (tenant !== "" && tenant !== "common" && tenant !== "organizations") {
    console.log("\nDe tenant");
    try {
      const response = await fetchWithTimeout(`https://login.microsoftonline.com/${tenant}/v2.0/.well-known/openid-configuration`);
      const document = (await response.json()) as { issuer?: string };
      line(response.ok && typeof document.issuer === "string", `het OpenID-document van de tenant is te lezen (${response.status})`);
      line(document.issuer === issuer.replace(/\/$/, ""), `de issuer in dat document is gelijk aan de variabele (${document.issuer ?? "geen"})`);
    } catch (error) {
      line(false, `het OpenID-document is niet te lezen: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  console.log("\nDe rollen die de tool verwacht als app roles, met exact deze waarden:");
  for (const role of APP_ROLES) console.log(`  ${role.padEnd(24)} ${ROLE_LABELS[role]}`);
  console.log("\nVergelijk ze met Microsoft Entra ID, App registrations, <de app>, App roles. Een waarde die daar anders heet, geeft een lege rol bij het inloggen.");
  console.log("Toewijzen gebeurt onder Enterprise applications, <de app>, Users and groups; zie docs/handleiding/11-toegang-beheren.md.");

  if (problems > 0) {
    console.log(`\n${problems} probleem(en). Zie docs/handleiding/05-entra.md.`);
    process.exitCode = 1;
  } else {
    console.log("\nDe inrichting klopt, voor zover hier te zien.");
  }
});
