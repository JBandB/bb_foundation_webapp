/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { currentActor } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { downloadUrl } from "@/lib/files/blob";
import { contentDisposition } from "@/lib/files/content-disposition";
import { fileById, isUuid } from "@/lib/files/store";
import { fetchWithTimeout } from "@/lib/integrations/http";

/**
 * Downloaden via de server: het recht wordt hier gecontroleerd en de inhoud doorgegeven, zodat het
 * SAS-token de browser nooit bereikt. Wat niet bestaat of niet mag, is een 404; wie niet is
 * ingelogd krijgt een 401. Altijd als bijlage en nooit uitgevoerd, met `nosniff`, en nooit gecachet.
 */
const DOWNLOAD_TIMEOUT_MS = 60_000;

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }): Promise<Response> {
  const actor = await currentActor();
  if (actor === undefined) return new Response(null, { status: 401 });

  const { id } = await context.params;
  if (!isUuid(id)) return new Response(null, { status: 404 });

  const file = await fileById(getDb(), actor, id);
  if (file === undefined) return new Response(null, { status: 404 });

  const source = downloadUrl(file.purpose, file.blobPath);
  if (source === undefined) return new Response(null, { status: 503 });

  const upstream = await fetchWithTimeout(source, {}, DOWNLOAD_TIMEOUT_MS);
  if (!upstream.ok || upstream.body === null) return new Response(null, { status: 502 });

  return new Response(upstream.body, {
    headers: {
      "content-type": file.contentType,
      "content-length": String(file.sizeBytes),
      "content-disposition": contentDisposition("attachment", file.name, "document"),
      "x-content-type-options": "nosniff",
      "cache-control": "private, no-store",
    },
  });
}
