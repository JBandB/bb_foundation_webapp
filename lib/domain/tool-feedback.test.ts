/* template-owned (module core). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { checkFeedback, FEEDBACK_LIMITS } from "./tool-feedback";

const texts = { required: "verplicht", tooLong: (max: number) => `max ${max}` };

describe("checkFeedback", () => {
  it("accepteert een melding en knipt het pad", () => {
    const result = checkFeedback({ title: " Titel ", body: "Tekst", path: "/admin/system?x=1" }, texts);
    expect(result).toEqual({ ok: true, value: { title: "Titel", body: "Tekst", path: "/admin/system?x=1" } });
  });

  it("weigert leeg en te lang, en maakt van een vreemd pad de wortel", () => {
    expect(checkFeedback({ title: "", body: "x".repeat(FEEDBACK_LIMITS.body + 1), path: "http://elders" }, texts)).toEqual({
      ok: false,
      errors: { title: "verplicht", body: `max ${FEEDBACK_LIMITS.body}` },
    });
    const result = checkFeedback({ title: "t", body: "b", path: 42 }, texts);
    expect(result.ok && result.value.path).toBe("/");
  });
});
