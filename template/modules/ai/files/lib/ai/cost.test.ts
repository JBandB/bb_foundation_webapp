/* template-owned (module ai). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { centTokens, formatCost, parsePrice, priceInput } from "./cost";

describe("een prijs per miljoen tokens", () => {
  it.each([
    ["0,10", 10],
    ["0.10", 10],
    ["0.1", 10],
    ["4", 400],
    ["$ 2,50", 250],
    ["0", 0],
    ["12345,67", 1_234_567],
  ])("leest %s als %i centen", (input, cents) => {
    expect(parsePrice(input)).toEqual({ ok: true, cents });
  });

  it.each([
    ["", "empty"],
    ["-1", "format"],
    ["0,105", "format"],
    ["1.000,00", "format"],
    ["een euro", "format"],
    ["999999,99", "tooLarge"],
  ])("weigert %s", (input, reason) => {
    expect(parsePrice(input)).toEqual({ ok: false, reason });
  });

  it("schrijft centen terug zoals een beheerder ze typte", () => {
    expect([priceInput(10), priceInput(400), priceInput(0), priceInput(1_234_567)]).toEqual(["0.10", "4.00", "0.00", "12345.67"]);
  });
});

describe("de kosten van een verzoek", () => {
  it("rekent exact in centtokens, en null zonder prijs", () => {
    expect(centTokens({ inputTokens: 1000, outputTokens: 200, inputCentsPerMtok: 10, outputCentsPerMtok: 50 })).toBe(20_000);
    expect(centTokens({ inputTokens: 0, outputTokens: 0, inputCentsPerMtok: 10, outputCentsPerMtok: 50 })).toBe(0);
    expect(centTokens({ inputTokens: 1000, outputTokens: 200, inputCentsPerMtok: null, outputCentsPerMtok: 50 })).toBeNull();
  });

  it("rondt pas af bij het tonen, op vier decimalen onder één eenheid en op de cent daarboven", () => {
    expect(formatCost(20_000, "USD", "en-US")).toBe("$0.0002");
    expect(formatCost(0, "USD", "en-US")).toBe("$0.00");
    expect(formatCost(150_000_000, "USD", "en-US")).toBe("$1.50");
    /* Intl zet een harde spatie tussen het teken en het bedrag. */
    expect(formatCost(400 * 1_000_000, "EUR", "nl-NL").replace(/\s/g, " ")).toBe("€ 4,00");
  });
});
