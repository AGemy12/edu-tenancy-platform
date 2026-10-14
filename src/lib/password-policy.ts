/**
 * What a new password must contain. Mirrors `backend/src/auth/password-policy.ts`, which is
 * what actually enforces it; keep the two in step.
 */
export const PASSWORD_MIN = 8;
/** bcrypt ignores everything after 72 bytes. */
export const PASSWORD_MAX = 72;

export const PASSWORD_RULES = [
  { key: "length", test: (v: string) => v.length >= PASSWORD_MIN },
  { key: "upper", test: (v: string) => /\p{Lu}/u.test(v) },
  { key: "lower", test: (v: string) => /\p{Ll}/u.test(v) },
  { key: "digit", test: (v: string) => /\p{Nd}/u.test(v) },
  { key: "symbol", test: (v: string) => /[^\p{L}\p{N}\s]/u.test(v) },
] as const;

export type PasswordRule = (typeof PASSWORD_RULES)[number]["key"];

export function isStrongPassword(value: string) {
  return value.length <= PASSWORD_MAX && PASSWORD_RULES.every((r) => r.test(value));
}
