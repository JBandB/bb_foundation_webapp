/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { contentSecurityPolicy, newNonce } from "./csp";

function directive(policy: string, name: string): string | undefined {
  return policy.split("; ").find((part) => part.startsWith(`${name} `));
}

describe("de CSP met een nonce", () => {
  it("laat in script-src alleen scripts met de nonce toe, zonder unsafe-inline", () => {
    const scripts = directive(contentSecurityPolicy("abc123", { development: false }), "script-src");
    expect(scripts).toBe("script-src 'self' 'nonce-abc123' 'strict-dynamic'");
    expect(scripts).not.toContain("unsafe-inline");
    expect(scripts).not.toContain("unsafe-eval");
  });

  it("zet unsafe-eval alleen in ontwikkeling", () => {
    expect(directive(contentSecurityPolicy("n", { development: true }), "script-src")).toContain("'unsafe-eval'");
  });

  it("houdt de slotjes van de vaste CSP: frames, base, formulieren, objecten, de worker en connect", () => {
    const policy = contentSecurityPolicy("n", { development: false });
    expect(policy).toContain("frame-ancestors 'none'");
    expect(policy).toContain("base-uri 'self'");
    expect(policy).toContain("form-action 'self'");
    expect(policy).toContain("object-src 'none'");
    expect(policy).toContain("worker-src 'self'");
    expect(policy).toContain("connect-src 'self'");
    expect(policy).toContain("style-src 'self' 'unsafe-inline'");
  });

  it("maakt per keer een ander getal van 128 bits", () => {
    const seen = new Set(Array.from({ length: 50 }, () => newNonce()));
    expect(seen.size).toBe(50);
    for (const nonce of seen) expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
  });
});
