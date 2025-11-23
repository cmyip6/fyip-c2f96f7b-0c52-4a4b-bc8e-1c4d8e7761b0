import { GetRoleResponseInterface } from './get-role-response.interface';
import { GetOrganizationResponseInterface } from './get-organization-response.interface';

export interface GetUserReponseInterface {
  id: string;
  username: string;
  email: string;
  roleId?: number;
  role?: GetRoleResponseInterface;
  organization?: GetOrganizationResponseInterface;
}
