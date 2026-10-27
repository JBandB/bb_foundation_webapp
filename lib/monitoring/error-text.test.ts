/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { labels } from "@/lib/i18n/labels";
import { errorForLog, errorForScreen } from "./error-text";

/*
 * Wat er van een fout in de serverlog en op een scherm komt. De vorm van de Drizzle-fout is die van
 * drizzle-orm: de query op de eerste regel, de parameters op de tweede, de fout van Postgres als cause.
 */

const QUERY = 'Failed query: insert into "users" ("email", "display_name") values ($1, $2)';
const PARAMS = "params: anna.devries@voorbeeld.invalid,Anna de Vries";

function drizzleError(cause: unknown): Error {
  return new Error(`${QUERY}\n${PARAMS}`, { cause });
}

const UNIQUE = {
  code: "23505",
  message: 'duplicate key value violates unique constraint "users_email_key"',
  detail: "Key (email)=(anna.devries@voorbeeld.invalid) already exists.",
  constraint: "users_email_key",
  table: "users",
};

describe("errorForLog", () => {
  it("zegt wat Postgres zei, zonder parameters en zonder detail", () => {
    const line = errorForLog(drizzleError(UNIQUE));
    expect(line).toContain("SQLSTATE 23505");
    expect(line).toContain("users_email_key");
    expect(line).not.toContain("anna.devries");
    expect(line).not.toContain("Anna de Vries");
  });

  it("houdt van een fout zonder Postgres-oorzaak alleen de eerste regel", () => {
    const line = errorForLog(drizzleError(new Error("fetch failed")));
    expect(line).toContain('insert into "users"');
    expect(line).not.toContain("params");
    expect(line).not.toContain("anna.devries");
  });

  it("haalt een e-mailadres uit een gewone melding", () => {
    expect(errorForLog(new Error("De mailserver weigerde anna@voorbeeld.invalid"))).toBe("De mailserver weigerde [e-mail]");
  });
});

describe("errorForScreen", () => {
  it("toont geen querytekst, ook niet als de oorzaak geen Postgres-fout is", () => {
    expect(errorForScreen(drizzleError(new Error("fetch failed")))).toBe("fetch failed");
  });

  it("toont de fout van Postgres als die er is", () => {
    const line = errorForScreen(drizzleError(UNIQUE));
    expect(line).toContain("SQLSTATE 23505");
    expect(line).not.toContain("insert into");
  });

  it("valt terug op een vaste zin als er onder de query niets is", () => {
    expect(errorForScreen(drizzleError(undefined))).toBe(labels.system.errorDetailsInLog);
  });

  it("laat een gewone fout gewoon staan, op één regel", () => {
    expect(errorForScreen(new Error("De dienst antwoordde 503\nmeer tekst"))).toBe("De dienst antwoordde 503");
    expect(errorForScreen("kale tekst")).toBe("kale tekst");
  });
});
