import { EntityTypeOptions } from '@libs/data/type/entity-type.enum';
import { UserRoleOptions } from '@libs/data/type/user-role.enum';
import { CustomDecorator, SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
interface ConfigInterface {
  [UserRoleOptions.ADMIN]?: boolean;
  [UserRoleOptions.OWNER]?: boolean;
  [UserRoleOptions.VIEWER]?: boolean;
}

const defaultConfig: ConfigInterface = {
  [UserRoleOptions.ADMIN]: true,
  [UserRoleOptions.OWNER]: true,
  [UserRoleOptions.VIEWER]: true,
};

const getRolesList = (config?: ConfigInterface): UserRoleOptions[] => {
  const finalConfig = { ...defaultConfig, ...config };
  return Object.values(UserRoleOptions).filter(
    (type) => finalConfig[type] === true,
  );
};

// assuming role hierarchy Owner > Admin > Viewer

export type RoleGuardHandlerType = {
  path: string;
  entityType: EntityTypeOptions;
  roles: UserRoleOptions[];
};

export const Viewer = (
  path: string,
  entityType = EntityTypeOptions.ORGANIZATION,
): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, { roles: getRolesList(), entityType, path });
export const Admin = (
  path: string,
  entityType = EntityTypeOptions.ORGANIZATION,
): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, {
    roles: getRolesList({ [UserRoleOptions.VIEWER]: false }),
    entityType,
    path,
  });
export const Owner = (
  path: string,
  entityType = EntityTypeOptions.ORGANIZATION,
): CustomDecorator<string> =>
  SetMetadata(ROLES_KEY, {
    roles: getRolesList({
      [UserRoleOptions.ADMIN]: false,
      [UserRoleOptions.VIEWER]: false,
    }),
    entityType,
    path,
  });
