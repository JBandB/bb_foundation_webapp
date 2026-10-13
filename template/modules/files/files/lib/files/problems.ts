/* template-owned (module files). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { labels } from "@/lib/i18n/labels";
import { purposeSpec, type UploadProblem } from "./blob";

/** Een probleem bij het brengen van een bestand als zin voor het scherm, in de taal van het project. */
export function uploadProblemText(purpose: string, problem: UploadProblem, detail?: string): string {
  const spec = purposeSpec(purpose);
  const texts = labels.files.errors;
  switch (problem) {
    case "notConfigured":
      return texts.notConfigured(detail ?? "");
    case "empty":
      return texts.empty;
    case "tooLarge":
      return texts.tooLarge(spec.maxBytes / 1024 / 1024);
    case "wrongType":
      return texts.wrongType(detail ?? [...new Set(spec.types.values())].join(", "));
    case "rejected":
      return texts.rejected(detail ?? "");
    default:
      return texts[problem];
  }
}

/** De regel onder een bestandsveld: welke types en hoe groot. */
export function limitsText(purpose: string): string {
  const spec = purposeSpec(purpose);
  return labels.files.limits([...new Set(spec.types.values())].join(", "), spec.maxBytes / 1024 / 1024);
}
