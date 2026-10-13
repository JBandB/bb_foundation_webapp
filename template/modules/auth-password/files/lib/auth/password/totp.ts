/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Tweestapsverificatie met tijdgebonden codes (TOTP, RFC 6238) uit node:crypto: HMAC-SHA1 over een
 * tijdvak van dertig seconden, zes cijfers. Elke authenticator-app kent dit; het geheim gaat als
 * otpauth-koppeling in een QR-code. Puur, zodat het te testen is met de vectoren uit de RFC.
 */
import { createHmac, randomBytes, timingSafeEqual } from "node:crypto";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
export const TOTP_STEP_SECONDS = 30;
export const TOTP_DIGITS = 6;

export function base32Encode(bytes: Uint8Array): string {
  let bits = 0;
  let value = 0;
  let out = "";
  for (const byte of bytes) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += ALPHABET[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += ALPHABET[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(text: string): Uint8Array {
  const clean = text.toUpperCase().replace(/[^A-Z2-7]/g, "");
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const char of clean) {
    value = (value << 5) | ALPHABET.indexOf(char);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Uint8Array.from(out);
}

/** Een nieuw geheim van 160 bits, als base32 zoals een authenticator-app het verwacht. */
export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

/** De code voor één tijdvak (de teller), volgens RFC 4226 en 6238. */
export function totpCode(secret: string, counter: number): string {
  const message = Buffer.alloc(8);
  message.writeBigUInt64BE(BigInt(counter));
  const digest = createHmac("sha1", Buffer.from(base32Decode(secret))).update(message).digest();
  const offset = (digest[digest.length - 1] ?? 0) & 15;
  const binary = ((digest[offset] ?? 0) & 127) << 24 | ((digest[offset + 1] ?? 0) & 255) << 16 | ((digest[offset + 2] ?? 0) & 255) << 8 | ((digest[offset + 3] ?? 0) & 255);
  return String(binary % 10 ** TOTP_DIGITS).padStart(TOTP_DIGITS, "0");
}

export function counterFor(now: Date): number {
  return Math.floor(now.getTime() / 1000 / TOTP_STEP_SECONDS);
}

/**
 * Klopt de code voor nu, het vorige of het volgende tijdvak? Eén vak speling vangt een klok die
 * iets voor- of achterloopt, en meer dan dat maakt raden te makkelijk.
 */
export function verifyTotp(secret: string, code: string, now: Date = new Date(), window = 1): boolean {
  const entered = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(entered)) return false;
  const counter = counterFor(now);
  for (let delta = -window; delta <= window; delta += 1) {
    const expected = totpCode(secret, counter + delta);
    if (timingSafeEqual(Buffer.from(expected), Buffer.from(entered))) return true;
  }
  return false;
}

/** De koppeling die in de QR-code gaat; de app leest er het geheim, de uitgever en het account uit. */
export function otpauthUrl(issuer: string, account: string, secret: string): string {
  const label = `${encodeURIComponent(issuer)}:${encodeURIComponent(account)}`;
  const params = new URLSearchParams({ secret, issuer, algorithm: "SHA1", digits: String(TOTP_DIGITS), period: String(TOTP_STEP_SECONDS) });
  return `otpauth://totp/${label}?${params.toString()}`;
}
