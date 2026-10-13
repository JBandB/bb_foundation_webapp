import type { Actor } from "@/lib/auth/actor";
import type { FileScope, FileSummary } from "./store";

/**
 * Rij-niveau-autorisatie van bestanden, van het project. De rechten `files:read` en `files:write`
 * uit de matrix zeggen of iemand überhaupt bestanden mag zien of brengen; dit zegt of hij dít
 * bestand mag zien of bij déze entiteit mag brengen. Standaard: ja zodra het recht er is. Een
 * project dat bestanden aan een klant of een team koppelt, kijkt hier naar `entityType` en
 * `entityId`, met een query als dat nodig is.
 *
 * Dit bestand is van het project en blijft staan bij een update van het template.
 */
export async function canReadFile(_actor: Actor, _file: FileSummary): Promise<boolean> {
  return true;
}

export async function canWriteFile(_actor: Actor, _scope: FileScope): Promise<boolean> {
  return true;
}
