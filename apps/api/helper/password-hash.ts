import * as bcrypt from 'bcrypt';

export async function hashPassword(rawPassword: string): Promise<string> {
  const saltRounds = 10;
  return await bcrypt.hash(rawPassword, saltRounds);
}
