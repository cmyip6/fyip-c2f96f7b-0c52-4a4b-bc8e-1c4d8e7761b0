export interface CreateUserInterface {
  password: string;
  username: string;
  email: string;
  name: string;
  roleId?: number;
  organizationId?: number;
}
