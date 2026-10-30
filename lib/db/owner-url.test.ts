/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { ownerUrl } from "./owner-url";

/**
 * De verbinding als eigenaar. Zie de kop van `owner-url.ts`.
 *
 * De gevaarlijke kant is een vaste waarde buiten productie: die zou een preview of een script op de
 * productiedatabase zetten. Daarom vooral de gevallen waarin hij niet mag tellen.
 */
const OWNER = "postgresql://neondb_owner:x@ep-orange-rain.example/neondb";
const UNPOOLED = "postgresql://neondb_owner:y@ep-branch.example/neondb";
const POOLED = "postgresql://neondb_owner:y@ep-branch-pooler.example/neondb";

describe("ownerUrl", () => {
  it("neemt in productie de eigen variabele", () => {
    expect(ownerUrl({ VERCEL_ENV: "production", DATABASE_URL_OWNER: OWNER, DATABASE_URL_UNPOOLED: UNPOOLED })).toBe(OWNER);
    expect(ownerUrl({ APP_ENV: "production", DATABASE_URL_OWNER: OWNER, DATABASE_URL_UNPOOLED: UNPOOLED })).toBe(OWNER);
  });

  it("valt in productie zonder eigen variabele terug op die van de koppeling", () => {
    expect(ownerUrl({ VERCEL_ENV: "production", DATABASE_URL_OWNER: " ", DATABASE_URL_UNPOOLED: UNPOOLED })).toBe(UNPOOLED);
  });

  it("negeert de eigen variabele in een preview, lokaal en zonder omgeving", () => {
    for (const env of [{ VERCEL_ENV: "preview" }, { APP_ENV: "local" }, { VERCEL_ENV: "development" }, {}]) {
      expect(ownerUrl({ ...env, DATABASE_URL_OWNER: OWNER, DATABASE_URL_UNPOOLED: UNPOOLED }), JSON.stringify(env)).toBe(UNPOOLED);
    }
  });

  it("neemt de gepoolde verbinding als er geen directe is, en niets als er niets is", () => {
    expect(ownerUrl({ DATABASE_URL: POOLED })).toBe(POOLED);
    expect(ownerUrl({})).toBeUndefined();
  });
});
