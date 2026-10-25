/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { afterEach, describe, expect, it, vi } from "vitest";
import { MAX_REPORT_LENGTH, describeError, reportError, scrubMessage } from "./report";

describe("scrubMessage", () => {
  it("laat de parameters van een Drizzle-melding weg", () => {
    const text = 'Failed query: insert into "users" ("email") values ($1)\nparams: iemand@voorbeeld.nl,geheim';
    const result = scrubMessage(text);
    expect(result).toContain("params: [weggelaten]");
    expect(result).not.toContain("geheim");
    expect(result).not.toContain("voorbeeld.nl");
  });

  it("maskeert de sleutelwaarde in een Postgres-detail en elk mailadres", () => {
    expect(scrubMessage("Key (email)=(iemand@voorbeeld.nl) already exists.")).toBe("Key (email)=(...) already exists.");
    expect(scrubMessage("Login voor iemand.anders+tag@sub.voorbeeld.org mislukt")).toBe("Login voor [e-mail] mislukt");
  });

  it("maskeert verbindingsstrings, bearer-tokens, JWT's en handtekeningen in een URL", () => {
    /* Geen geheim: een verzonnen verbindingsstring, precies wat deze test hoort weg te poetsen. */
    // secretlint-disable-next-line
    expect(scrubMessage("connect postgresql://app:wachtwoord@ep-x.eu-central-1.aws.neon.tech/db?sslmode=require failed")).toBe("connect [verbindingsstring] failed");
    expect(scrubMessage("header Authorization: Bearer abc.def-ghi_jkl")).toBe("header Authorization: Bearer [token]");
    expect(scrubMessage("token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0In0.sig_part-here")).toBe("token [token]");
    expect(scrubMessage("GET https://x.blob.core.windows.net/c/f.png?sv=2024&sig=abc%2Bdef&se=2027")).toBe("GET https://x.blob.core.windows.net/c/f.png?sv=[weggelaten]&sig=[weggelaten]&se=[weggelaten]");
  });

  it("kapt af op de maximale lengte en zegt dat", () => {
    const result = scrubMessage("x".repeat(MAX_REPORT_LENGTH + 50));
    expect(result.length).toBe(MAX_REPORT_LENGTH + " [afgekapt]".length);
    expect(result.endsWith("[afgekapt]")).toBe(true);
  });

  it("laat een gewone melding met rust", () => {
    expect(scrubMessage("Geen organisatie gevonden. Draai pnpm db:bootstrap.")).toBe("Geen organisatie gevonden. Draai pnpm db:bootstrap.");
  });
});

describe("describeError", () => {
  it("neemt naam, digest en een schoongemaakte stack mee", () => {
    const error = Object.assign(new Error("Key (email)=(a@b.nl) already exists."), { digest: "1234567890" });
    const report = describeError(error);
    expect(report.name).toBe("Error");
    expect(report.digest).toBe("1234567890");
    expect(report.message).toBe("Key (email)=(...) already exists.");
    expect(report.stack).not.toContain("a@b.nl");
  });

  it("kan ook een gegooide string of een onbeschrijfbaar object aan", () => {
    expect(describeError("iets@voorbeeld.nl ging mis")).toEqual({ name: "string", message: "[e-mail] ging mis", stack: undefined, digest: undefined });
    const hostile = {
      toString() {
        throw new Error("nee");
      },
    };
    expect(describeError(hostile).message).toBe("[niet te beschrijven]");
  });
});

describe("reportError", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("schrijft één schoongemaakte regel naar de console en gooit nooit", async () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await expect(reportError(new Error("mail naar iemand@voorbeeld.nl mislukt"), { kind: "action", method: "POST", route: "/app/admin" })).resolves.toBeUndefined();
    const first = spy.mock.calls[0]?.[0];
    expect(first).toBe("[report] action POST /app/admin: Error: mail naar [e-mail] mislukt");
  });

  it("overleeft een console die zelf gooit", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {
      throw new Error("console kapot");
    });
    await expect(reportError(new Error("x"))).resolves.toBeUndefined();
  });
});
