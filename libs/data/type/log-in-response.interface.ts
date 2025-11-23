import { AuthUserInterface } from './auth-user.interface';
export interface LoginResponseInterface {
  token: string;
  user: AuthUserInterface;
}
