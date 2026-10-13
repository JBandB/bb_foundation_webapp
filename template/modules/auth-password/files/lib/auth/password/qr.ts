/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
import { toString as qrToString } from "qrcode";

/** De otpauth-koppeling als SVG, om inline te tonen; geen afbeelding die ergens anders vandaan moet komen. */
export async function qrSvg(text: string): Promise<string> {
  return qrToString(text, { type: "svg", margin: 1, width: 192, errorCorrectionLevel: "M" });
}
