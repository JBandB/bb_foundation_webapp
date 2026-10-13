/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Het TOTP-geheim staat versleuteld in de database: wie een kopie van de tabel heeft, kan er geen
 * codes mee maken. AES-256-GCM met een sleutel afgeleid uit AUTH_SECRET (HKDF, met de slug van het
 * project als zout), zodat er geen tweede geheim in Vercel hoeft. Draait AUTH_SECRET, dan zijn de
 * geheimen onleesbaar en moet iedereen tweestapsverificatie opnieuw instellen: dat is de prijs.
 *
 * Opslag: `v1$<iv>$<tag>$<cijfertekst>`, alles base64url.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from "node:crypto";
import { PROJECT } from "@/lib/project/config.generated";

const VERSION = "v1";

export function boxKey(secret: string, salt: string = PROJECT.slug): Buffer {
  if (secret.length < 16) throw new Error("AUTH_SECRET is te kort om een sleutel uit af te leiden.");
  return Buffer.from(hkdfSync("sha256", secret, salt, "mfa-secret", 32));
}

export function boxKeyFromEnv(): Buffer {
  const secret = process.env.AUTH_SECRET ?? "";
  if (secret === "") throw new Error("AUTH_SECRET ontbreekt; zonder kan het TOTP-geheim niet worden opgeslagen.");
  return boxKey(secret);
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
