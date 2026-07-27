export const PASSWORD_MIN_LENGTH = 8;

export const PASSWORD_HINT =
  "A senha deve conter pelo menos 8 caracteres, incluindo uma letra maiúscula, uma letra minúscula e um número.";

export const PASSWORD_ERROR_MESSAGE =
  "Crie uma senha com pelo menos 8 caracteres, uma letra maiúscula, uma letra minúscula e um número.";

export const PASSWORD_PLACEHOLDER = "Ex.: Amada2026";

export type PasswordRuleId = "length" | "uppercase" | "lowercase" | "number";

export type PasswordRule = {
  id: PasswordRuleId;
  label: string;
  test: (value: string) => boolean;
};

export const PASSWORD_RULES: PasswordRule[] = [
  { id: "length", label: "Pelo menos 8 caracteres", test: (v) => v.length >= PASSWORD_MIN_LENGTH },
  { id: "uppercase", label: "Uma letra maiúscula", test: (v) => /[A-ZÀ-Þ]/.test(v) },
  { id: "lowercase", label: "Uma letra minúscula", test: (v) => /[a-zß-ÿ]/.test(v) },
  { id: "number", label: "Um número", test: (v) => /[0-9]/.test(v) },
];

export function evaluatePassword(value: string): Record<PasswordRuleId, boolean> {
  return PASSWORD_RULES.reduce((acc, rule) => {
    acc[rule.id] = rule.test(value);
    return acc;
  }, {} as Record<PasswordRuleId, boolean>);
}

export function isPasswordValid(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}
