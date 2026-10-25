/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { requestHost, requestOriginVerdict } from "./request-origin";

const json = { "content-type": "application/json" };
const verdict = (headers: Record<string, string>) => requestOriginVerdict(new Headers(headers));

describe("requestOriginVerdict", () => {
  it("laat een verzoek van deze site door", () => {
    expect(verdict({ ...json, host: "tool.example.org", origin: "https://tool.example.org", "sec-fetch-site": "same-origin" })).toEqual({ ok: true });
  });

  it("weigert een verzoek van een ander subdomein of een andere site", () => {
    expect(verdict({ ...json, host: "tool.example.org", "sec-fetch-site": "same-site" })).toMatchObject({ ok: false, status: 403 });
    expect(verdict({ ...json, host: "tool.example.org", origin: "https://andere.example.org" })).toMatchObject({ ok: false, status: 403 });
    expect(verdict({ ...json, host: "tool.example.org", origin: "null" })).toMatchObject({ ok: false, status: 403 });
  });

  it("vergelijkt met de doorgestuurde host, zoals Next", () => {
    expect(verdict({ ...json, host: "intern:3000", "x-forwarded-host": "Tool.Example.org, proxy", origin: "https://tool.example.org" })).toEqual({ ok: true });
    expect(requestHost(new Headers({ host: " TOOL.example.org " }))).toBe("tool.example.org");
  });

  it("weigert alles wat geen JSON is, met 415, ook zonder herkomstheaders", () => {
    expect(verdict({ host: "tool.example.org", "content-type": "text/plain" })).toMatchObject({ ok: false, status: 415 });
    expect(verdict({ host: "tool.example.org" })).toMatchObject({ ok: false, status: 415 });
    expect(verdict({ host: "tool.example.org", "content-type": "application/json; charset=utf-8" })).toEqual({ ok: true });
  });
});
