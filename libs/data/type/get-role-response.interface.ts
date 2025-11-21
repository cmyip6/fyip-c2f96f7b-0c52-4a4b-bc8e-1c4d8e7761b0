import { GetOrganizationResponseInterface } from './get-organization-response.interface';

export interface GetRoleResponseInterface {
  id: string;
  name: string;
  description?: string;
  organization?: GetOrganizationResponseInterface;
}
