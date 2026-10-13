/* template-owned (module messaging). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { describe, expect, it } from "vitest";
import { bundleMail } from "./mail-bundle";

const subjectFor = (count: number): string => `${count} berichten`;

describe("bundleMail", () => {
  it("laat een enkel bericht met rust", () => {
    const bundles = bundleMail([{ id: "1", toEmail: "a@voorbeeld.invalid", subject: "Eén", bodyMd: "tekst" }], subjectFor);
    expect(bundles).toEqual([{ toEmail: "a@voorbeeld.invalid", subject: "Eén", bodyMd: "tekst", ids: ["1"] }]);
  });

  it("bundelt per ontvanger met de onderwerpen als koppen, in volgorde", () => {
    const bundles = bundleMail(
      [
        { id: "1", toEmail: "a@voorbeeld.invalid", subject: "Eerste", bodyMd: "een\n" },
        { id: "2", toEmail: "b@voorbeeld.invalid", subject: "Ander", bodyMd: "ander" },
        { id: "3", toEmail: "a@voorbeeld.invalid", subject: "Tweede", bodyMd: "twee" },
      ],
      subjectFor,
    );
    expect(bundles).toHaveLength(2);
    expect(bundles[0]).toEqual({ toEmail: "a@voorbeeld.invalid", subject: "2 berichten", bodyMd: "**Eerste**\n\neen\n\n**Tweede**\n\ntwee", ids: ["1", "3"] });
    expect(bundles[1]?.ids).toEqual(["2"]);
  });

  it("geeft niets terug voor niets", () => {
    expect(bundleMail([], subjectFor)).toEqual([]);
  });
});
