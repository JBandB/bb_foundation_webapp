/* template-owned (module auth-password). Wordt overschreven door pnpm template:update; wijzig dit bestand niet. */
/**
 * De wachtwoordregel: minstens twaalf tekens, hoogstens tweehonderd, en niet het eigen adres erin.
 * Geen eis op cijfers of leestekens: lengte is wat telt, en een zin onthoudt een mens beter dan
 * `P@ssw0rd1!`. Puur.
 */

export const PASSWORD_MIN_LENGTH = 12;
export const PASSWORD_MAX_LENGTH = 200;

export type PasswordProblem = "tooShort" | "tooLong" | "containsEmail" | "mismatch";

export type PasswordCheck = { readonly ok: true } | { readonly ok: false; readonly problem: PasswordProblem };

export function checkPassword(password: string, email: string, confirmation?: string): PasswordCheck {
  if (password.length < PASSWORD_MIN_LENGTH) return { ok: false, problem: "tooShort" };
  if (password.length > PASSWORD_MAX_LENGTH) return { ok: false, problem: "tooLong" };
  const local = email.split("@")[0]?.toLowerCase() ?? "";
  if (local.length >= 4 && password.toLowerCase().includes(local)) return { ok: false, problem: "containsEmail" };
  if (confirmation !== undefined && confirmation !== password) return { ok: false, problem: "mismatch" };
  return { ok: true };
}
