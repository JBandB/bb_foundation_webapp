/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `pnpm blob:status`: per doel of de opslag is ingericht, en een echte proef: één pixel erin en weer
 * eruit. Voor het inrichten (handleiding 22) en als iets op Beheer, Systeem rood staat.
 */
import { ACCOUNT_VAR, downloadUrl, isConfigured, missingConfig, purposeSpec, uploadBlob } from "../lib/files/blob";
import { sasDaysLeft, SAS_EXPIRES_VAR } from "../lib/files/health-provider";
import { FILE_PURPOSES } from "../lib/files/purposes";
import { fetchWithTimeout } from "../lib/integrations/http";
import { runScript } from "./lib/run";

const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

runScript(async () => {
  const account = process.env[ACCOUNT_VAR] ?? "";
  console.log(`Storage account: ${account === "" ? "niet ingesteld" : account}`);
  const days = sasDaysLeft();
  console.log(days === null ? `Vervaldatum: ${SAS_EXPIRES_VAR} is leeg; vul hem in, dan waarschuwt Beheer, Systeem op tijd.` : `Vervaldatum token: over ${days} dagen.`);

  let failed = 0;
  for (const purpose of Object.keys(FILE_PURPOSES)) {
    const spec = purposeSpec(purpose);
    console.log(`\nDoel ${purpose}: ${spec.maxBytes / 1024 / 1024} MB, ${[...new Set(spec.types.values())].join(", ")}`);
    if (!isConfigured(purpose)) {
      console.log(`  overgeslagen, ontbreekt: ${missingConfig(purpose).join(", ")}`);
      continue;
    }
    if (!spec.types.has("image/png")) {
      console.log("  geen proef: dit doel neemt geen png aan, en de proef is een pixel");
      continue;
    }
    const file = new File([new Uint8Array(PIXEL)], "blob-status.png", { type: "image/png" });
    const uploaded = await uploadBlob({ purpose, entityType: "_selftest", entityId: "blob-status", file });
    if (!uploaded.ok) {
      failed += 1;
      console.log(`  FOUT bij uploaden: ${uploaded.problem} ${uploaded.detail ?? ""}`);
      continue;
    }
    const url = downloadUrl(purpose, uploaded.blobPath);
    const response = url === undefined ? undefined : await fetchWithTimeout(url);
    if (response === undefined || !response.ok) {
      failed += 1;
      console.log(`  geschreven naar ${uploaded.blobPath}, maar teruglezen gaf status ${response?.status ?? "geen antwoord"}; het token mist Read`);
      continue;
    }
    console.log(`  ok: geschreven en teruggelezen (${uploaded.blobPath})`);
  }

  if (failed > 0) {
    console.log(`\n${failed} doel(en) werken niet. Zie docs/handleiding/22-azure-blob.md.`);
    process.exitCode = 1;
  }
});
