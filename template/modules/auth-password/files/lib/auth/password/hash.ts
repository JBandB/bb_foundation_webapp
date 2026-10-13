/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * Wachtwoorden opslaan met scrypt uit node:crypto, met een eigen zout per wachtwoord. Geen extra
 * pakket: scrypt is ontworpen om traag te zijn voor wie een gestolen tabel wil raden, en de
 * parameters staan in de opgeslagen tekst, zodat zwaarder maken later geen oude hashes breekt.
 *
 * Opslag: `scrypt$<N>$<zout>$<hash>`, alles base64url.
 */
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(scryptCallback) as (password: string, salt: Buffer, keylen: number, options: { N: number; r: number; p: number; maxmem: number }) => Promise<Buffer>;

const KEY_LENGTH = 64;
const COST_N = 16384;
const COST_R = 8;
const COST_P = 1;

function options(n: number): { N: number; r: number; p: number; maxmem: number } {
  /* Het geheugen dat scrypt nodig heeft is 128 * N * r; ruim erboven blijven voorkomt een vage fout bij een hogere N. */
  return { N: n, r: COST_R, p: COST_P, maxmem: 256 * n * COST_R };
}

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const key = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, options(COST_N));
  return `scrypt$${COST_N}$${salt.toString("base64url")}$${key.toString("base64url")}`;
}

/** Vergelijkt in constante tijd; een onleesbare opslag telt als fout en niet als crash. */
export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "scrypt") return false;
  const n = Number(parts[1]);
  if (!Number.isInteger(n) || n < 1024 || (n & (n - 1)) !== 0) return false;
  const salt = Buffer.from(parts[2] ?? "", "base64url");
  const expected = Buffer.from(parts[3] ?? "", "base64url");
  if (salt.length === 0 || expected.length !== KEY_LENGTH) return false;
  const actual = await scrypt(password.normalize("NFKC"), salt, KEY_LENGTH, options(n));
  return timingSafeEqual(actual, expected);
}
