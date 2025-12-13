export const PASSWORD_REGEX =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{10,}$/;

export function validatePassword(password: string): boolean {
  return PASSWORD_REGEX.test(password);
}
