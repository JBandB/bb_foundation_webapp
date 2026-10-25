/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { epochSeconds, SESSION_MAX_AGE_SECONDS, sessionExpired } from "./session-age";

const LOGIN = 1_790_000_000;

describe("sessionExpired", () => {
  it("is geldig direct na het inloggen en precies op de grens", () => {
    expect(sessionExpired(LOGIN, LOGIN, SESSION_MAX_AGE_SECONDS)).toBe(false);
    expect(sessionExpired(LOGIN, LOGIN + SESSION_MAX_AGE_SECONDS, SESSION_MAX_AGE_SECONDS)).toBe(false);
  });

  it("is verlopen een seconde na de grens, hoe vaak het token ook ververst werd", () => {
    expect(sessionExpired(LOGIN, LOGIN + SESSION_MAX_AGE_SECONDS + 1, SESSION_MAX_AGE_SECONDS)).toBe(true);
  });

  it("telt een cookie zonder inlogmoment als verlopen", () => {
    expect(sessionExpired(undefined, LOGIN, SESSION_MAX_AGE_SECONDS)).toBe(true);
    expect(sessionExpired(null, LOGIN, SESSION_MAX_AGE_SECONDS)).toBe(true);
  });

  it("telt een onleesbaar inlogmoment als verlopen", () => {
    expect(sessionExpired(String(LOGIN), LOGIN, SESSION_MAX_AGE_SECONDS)).toBe(true);
    expect(sessionExpired(Number.NaN, LOGIN, SESSION_MAX_AGE_SECONDS)).toBe(true);
    expect(sessionExpired(Number.POSITIVE_INFINITY, LOGIN, SESSION_MAX_AGE_SECONDS)).toBe(true);
  });

  it("is acht uur", () => {
    expect(SESSION_MAX_AGE_SECONDS).toBe(28_800);
  });
});

describe("epochSeconds", () => {
  it("rondt af naar beneden op hele seconden", () => {
    expect(epochSeconds(new Date(1_790_000_000_999))).toBe(1_790_000_000);
  });
});
