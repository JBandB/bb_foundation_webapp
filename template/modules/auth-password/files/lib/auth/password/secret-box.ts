/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het TOTP-geheim staat versleuteld in de database: wie een kopie van de tabel heeft, kan er geen
 * codes mee maken. AES-256-GCM met een sleutel afgeleid uit een geheim (HKDF, met de slug van het
 * project als zout).
 *
 * **Welk geheim.** `MFA_SECRET_KEY` als die gezet is, anders `AUTH_SECRET`. Een eigen sleutel is
 * nodig zodra je via een preview test: Production en Preview hebben elk een eigen `AUTH_SECRET`
 * (handleiding 06), en dan kon een account met tweestapsverificatie op de preview niet inloggen.
 * Zet `MFA_SECRET_KEY` daarom gelijk in Production en Preview. Zonder blijft alles werken zoals
 * voorheen, alleen niet op een preview.
 *
 * **Overstappen zonder dat iemand opnieuw moet instellen.** Staat `MFA_SECRET_KEY`, dan probeert
 * openen eerst die sleutel en daarna de oude uit `AUTH_SECRET`; de inlog versleutelt een oud geheim
 * dan meteen opnieuw met de nieuwe sleutel. Draait het geheim waaruit de sleutel komt, dan zijn de
 * geheimen onleesbaar en moet iedereen tweestapsverificatie opnieuw instellen: dat is de prijs.
 *
 * Opslag: `v1$<iv>$<tag>$<cijfertekst>`, alles base64url.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { PROJECT } from "@/lib/project/config.generated";

const VERSION = "v1";

export function boxKey(secret: string, salt: string = PROJECT.slug): Buffer {
  if (secret.length < 16) throw new Error("Het geheim is te kort om een sleutel uit af te leiden.");
  return Buffer.from(hkdfSync("sha256", secret, salt, "mfa-secret", 32));
}

/**
 * De sleutels uit de omgeving: de eerste versleutelt, de rest mag alleen nog openen. Zonder
 * `MFA_SECRET_KEY` is er één sleutel, uit `AUTH_SECRET`.
 */
export function boxKeysFromEnv(): Buffer[] {
  const dedicated = process.env.MFA_SECRET_KEY ?? "";
  const auth = process.env.AUTH_SECRET ?? "";
  const keys: Buffer[] = [];
  if (dedicated !== "") keys.push(boxKey(dedicated));
  if (auth !== "") keys.push(boxKey(auth));
  if (keys.length === 0) throw new Error("MFA_SECRET_KEY en AUTH_SECRET ontbreken; zonder kan het TOTP-geheim niet worden opgeslagen.");
  return keys;
}

/** De sleutel waarmee nieuw wordt versleuteld. */
export function boxKeyFromEnv(): Buffer {
  const [primary] = boxKeysFromEnv();
  if (primary === undefined) throw new Error("Geen sleutel voor het TOTP-geheim.");
  return primary;
}

export function seal(plain: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join("$");
}

/** Geeft undefined terug bij een verkeerde sleutel of een aangepaste tekst, nooit een halve uitkomst. */
export function open(boxed: string, key: Buffer): string | undefined {
  const parts = boxed.split("$");
  if (parts.length !== 4 || parts[0] !== VERSION) return undefined;
  try {
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(parts[1] ?? "", "base64url"));
    decipher.setAuthTag(Buffer.from(parts[2] ?? "", "base64url"));
    return Buffer.concat([decipher.update(Buffer.from(parts[3] ?? "", "base64url")), decipher.final()]).toString("utf8");
  } catch {
    return undefined;
  }
}

/**
 * Openen met de eerste sleutel die past. `stale` is waar als dat niet de eerste was: dan hoort het
 * geheim opnieuw versleuteld te worden met de sleutel van nu.
 */
export function openWithKeys(boxed: string, keys: readonly Buffer[]): { plain: string; stale: boolean } | undefined {
  for (const [index, key] of keys.entries()) {
    const plain = open(boxed, key);
    if (plain !== undefined) return { plain, stale: index > 0 };
  }
  return undefined;
}

/** `openWithKeys` met de sleutels uit de omgeving. */
export function openFromEnv(boxed: string): { plain: string; stale: boolean } | undefined {
  return openWithKeys(boxed, boxKeysFromEnv());
}
