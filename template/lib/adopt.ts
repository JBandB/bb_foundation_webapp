/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * `template:adopt <pad>`: een bestand van het template blijvend van het project maken. Het blijft
 * staan, krijgt de kop `template-adopted`, en het template schrijft het nooit meer. Met `--remove`
 * gaat het bestand weg (met een kopie in .template-backup/) en komt het bij een update niet terug.
 */

import { rmSync } from "node:fs";
import { join } from "node:path";
import { BACKUP_DIR } from "./apply";
import { adoptedHeaderLine, withHeader } from "./header";
import { fileExists, isBinaryPath, readBytes, readText, writeBytes, writeText } from "./files";
import { LOCK_FILE, readLock, writeLock } from "./lock";

export interface AdoptResult {
  readonly path: string;
  readonly removed: boolean;
  readonly headerChanged: boolean;
}

export function adoptFile(root: string, path: string, options: { remove: boolean }): AdoptResult {
  const lock = readLock(root);
  if (lock === undefined) throw new Error(`${LOCK_FILE} ontbreekt. Draai eerst pnpm template:apply.`);
  const entry = lock.files[path];
  if (entry === undefined && !lock.adopted.includes(path)) {
    throw new Error(`${path} staat niet in de lock als bestand van het template. Alleen owned en generated bestanden zijn over te nemen.`);
  }
  if (entry?.class === "seed") throw new Error(`${path} is een seed en is al van het project.`);

  const target = join(root, path);
  let headerChanged = false;

  if (options.remove) {
    if (fileExists(target)) {
      writeBytes(join(root, BACKUP_DIR, path), readBytes(target));
      rmSync(target);
    }
  } else if (fileExists(target) && !isBinaryPath(path)) {
    const header = adoptedHeaderLine(path, entry?.module ?? "core", lock.version);
    if (header !== undefined) {
      const text = readText(target);
      const next = withHeader(text, header);
      if (next !== text) {
        writeText(target, next);
        headerChanged = true;
      }
    }
  }

  const files = { ...lock.files };
  delete files[path];
  writeLock(root, { ...lock, files, adopted: lock.adopted.includes(path) ? lock.adopted : [...lock.adopted, path] });

  return { path, removed: options.remove, headerChanged };
}
