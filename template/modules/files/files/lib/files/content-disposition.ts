/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De Content-Disposition-kop met een bestandsnaam die elke browser begrijpt: een ASCII-versie voor
 * oude clients en de echte naam als UTF-8 volgens RFC 5987. Een naam uit een upload kan alles
 * bevatten, en een aanhalingsteken erin zou de kop breken.
 */
export function contentDisposition(type: "attachment" | "inline", name: string, fallbackBase: string): string {
  const trimmed = name.trim();
  const extension = /\.[A-Za-z0-9]{1,8}$/.exec(trimmed)?.[0] ?? "";
  const ascii = trimmed
    .replace(/[^\x20-\x7e]/g, "_")
    .replace(/["\\;]/g, "_")
    .trim();
  /* Blijft er voor de extensie geen letter of cijfer over, dan zegt de ASCII-naam niets meer. */
  const stem = ascii.slice(0, ascii.length - extension.length);
  const safe = !/[A-Za-z0-9]/.test(stem) ? `${fallbackBase}${extension}` : ascii;
  return `${type}; filename="${safe}"; filename*=UTF-8''${encodeRfc5987(trimmed === "" ? safe : trimmed)}`;
}

function encodeRfc5987(value: string): string {
  return encodeURIComponent(value).replace(/['()*]/g, (char) => `%${char.charCodeAt(0).toString(16).toUpperCase()}`);
}
