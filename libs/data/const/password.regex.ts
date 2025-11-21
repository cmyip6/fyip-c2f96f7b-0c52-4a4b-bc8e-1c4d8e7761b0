export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])(?!.*\s).{10,}$/;

export function validatePassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}
