export interface OrganizationRoleInterface {
  role: { id: number; name: string };
  organization: { id: number; name: string };
}

export interface AuthUserInterface {
  id: string;
  email: string;
  name: string;
  roles: OrganizationRoleInterface[];
  tokenExpiry: number;
}
