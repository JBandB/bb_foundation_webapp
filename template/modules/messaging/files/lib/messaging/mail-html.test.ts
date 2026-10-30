/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { escapeHtml, mailHtml, oneLineUntrusted, quoteUntrusted } from "./mail-html";

const shell = { buttonLabel: "Openen", footer: "Een voet." };

/* Het eigen adres komt lokaal uit AUTH_URL; de configuratie van het template heeft nog geen productionUrl. */
const previousAuthUrl = process.env.AUTH_URL;
beforeAll(() => {
  process.env.AUTH_URL = "https://voorbeeld.invalid";
});
afterAll(() => {
  if (previousAuthUrl === undefined) delete process.env.AUTH_URL;
  else process.env.AUTH_URL = previousAuthUrl;
});

describe("mailHtml", () => {
  it("maakt van een alinea met één eigen koppeling een knop en van de rest tekst", () => {
    const html = mailHtml("Hallo **Anna**.\n\nhttps://voorbeeld.invalid/x?a=1&b=2", shell);
    expect(html).toContain("<strong>Anna</strong>");
    expect(html).toContain('href="https://voorbeeld.invalid/x?a=1&amp;b=2"');
    expect(html).toContain(">Openen</a>");
    expect(html).toContain("Een voet.");
  });

  it("laat een koppeling naar een ander adres tekst, ook als hij alleen op een regel staat", () => {
    const html = mailHtml("Kijk hier:\n\nhttps://kwaad.invalid/login", shell);
    expect(html).not.toContain('href="https://kwaad.invalid');
    expect(html).toContain("https://kwaad.invalid/login");
  });

  it("ontsnapt alles wat uit een bericht komt", () => {
    expect(escapeHtml(`<script>alert("x")</script> & 'q'`)).toBe("&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt; &amp; &#39;q&#39;");
    expect(mailHtml("<b>niet vet</b>", shell)).toContain("&lt;b&gt;niet vet&lt;/b&gt;");
  });

  it("zet tekst van buiten als citaat, regel voor regel", () => {
    expect(quoteUntrusted("eerste\n\nhttps://kwaad.invalid")).toBe("> eerste\n>\n> https://kwaad.invalid");
  });
});

describe("oneLineUntrusted", () => {
  it("zet witregels, tabs en stuurtekens om in één spatie", () => {
    expect(oneLineUntrusted("Anna\n\nhttps://kwaad.invalid\r\n\tde Vries")).toBe("Anna https://kwaad.invalid de Vries");
    expect(oneLineUntrusted("a\u2028b\u0000c")).toBe("a b c");
  });

  it("laat een naam als alinea nooit een knop worden", () => {
    const name = oneLineUntrusted("Anna\n\nhttps://kwaad.invalid/aanmelden\n\nde Vries");
    const html = mailHtml(`${name} (anna@voorbeeld.invalid) kan niet inloggen:`, shell);
    expect(html).not.toContain('href="https://kwaad.invalid');
  });
});
